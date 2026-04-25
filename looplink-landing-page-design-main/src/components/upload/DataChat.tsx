/**
 * DataChat — "Chat with your data" AI panel
 * Natural language queries + rule-based bulk edits with confirmation
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import type { ParsedTransaction, StatementSummary } from "@/lib/statementParser";

interface Rule {
  id: string;
  description: string;
  pattern: string; // keyword to match in description
  action: "set_type" | "set_category" | "ignore";
  value: string;
  createdAt: number;
}

interface PendingRule {
  rule: Rule;
  affectedIds: string[];
  confirmMessage: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: PendingRule;
}

interface DataChatProps {
  transactions: ParsedTransaction[];
  summary: StatementSummary;
  onUpdateTransactions: (updated: ParsedTransaction[]) => void;
}

const RULES_KEY = "aje_data_rules";

function loadRules(): Rule[] {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) ?? "[]"); } catch { return []; }
}

function saveRules(rules: Rule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

function applyRulesToTransactions(txs: ParsedTransaction[], rules: Rule[]): ParsedTransaction[] {
  return txs.map(tx => {
    let updated = { ...tx };
    for (const rule of rules) {
      if (tx.description.toLowerCase().includes(rule.pattern.toLowerCase())) {
        if (rule.action === "set_type") updated.type = rule.value as ParsedTransaction["type"];
        if (rule.action === "set_category") updated.category = rule.value;
        if (rule.action === "ignore") updated.type = "unknown";
      }
    }
    return updated;
  });
}

// Format a list of transactions as a numbered result string
function formatTxList(txs: ParsedTransaction[], label: string): string {
  if (txs.length === 0) return `No transactions found${label ? ` ${label}` : ""}.`;
  const lines = txs.slice(0, 20).map((t, i) =>
    `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description}`
  );
  const suffix = txs.length > 20 ? `\n…and ${txs.length - 20} more.` : "";
  return `${txs.length} transaction${txs.length > 1 ? "s" : ""} ${label}:\n\n${lines.join("\n")}${suffix}`;
}

// Parse user intent locally — fast, no API needed for simple queries
function parseIntent(msg: string, txs: ParsedTransaction[], summary: StatementSummary): string | PendingRule | null {
  const m = msg.toLowerCase().trim();

  // ── QUERY: amount filter — "above/over/greater than X" ──
  const aboveMatch = m.match(/(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (aboveMatch) {
    const threshold = parseFloat(aboveMatch[1].replace(/,/g, ""));
    const filtered = [...txs.filter(t => t.amount >= threshold)].sort((a, b) => b.amount - a.amount);
    return formatTxList(filtered, `above ₦${threshold.toLocaleString()}`);
  }

  // ── QUERY: amount filter — "below/under/less than X" ──
  const belowMatch = m.match(/(?:below|under|less than)\s+₦?([\d,]+)/);
  if (belowMatch) {
    const threshold = parseFloat(belowMatch[1].replace(/,/g, ""));
    const filtered = [...txs.filter(t => t.amount <= threshold && t.amount > 0)].sort((a, b) => b.amount - a.amount);
    return formatTxList(filtered, `below ₦${threshold.toLocaleString()}`);
  }

  // ── QUERY: show transactions by category/keyword ──
  const showMatch = m.match(/(?:show|list|find|get)\s+(?:me\s+)?(?:all\s+)?(.+?)(?:\s+transactions?)?$/);
  if (showMatch && !m.includes("how much") && !m.includes("total")) {
    const keyword = showMatch[1].trim();
    const typeMap: Record<string, ParsedTransaction["type"]> = { income: "income", expense: "expense", expenses: "expense", transfer: "transfer", transfers: "transfer" };
    if (typeMap[keyword]) {
      const filtered = txs.filter(t => t.type === typeMap[keyword]);
      return formatTxList(filtered, `(${keyword})`);
    }
    // keyword search in description or category
    const filtered = txs.filter(t =>
      t.description.toLowerCase().includes(keyword) ||
      t.category.toLowerCase().includes(keyword)
    );
    return formatTxList(filtered, `matching "${keyword}"`);
  }

  // ── QUERY: how much did I make / income ──
  if (m.includes("how much") && (m.includes("make") || m.includes("earn") || m.includes("income") || m.includes("revenue"))) {
    const income = txs.filter(t => t.type === "income");
    if (m.includes("week")) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      const filtered = income.filter(t => new Date(t.date) >= cutoff);
      const total = filtered.reduce((s, t) => s + t.amount, 0);
      return `Income this week: ₦${total.toLocaleString()} across ${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}.`;
    }
    if (m.includes("month")) {
      const now = new Date();
      const filtered = income.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      const total = filtered.reduce((s, t) => s + t.amount, 0);
      return `Income this month: ₦${total.toLocaleString()} across ${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}.`;
    }
    return `Total income: ₦${summary.totalIncome.toLocaleString()} from ${income.length} transaction${income.length !== 1 ? "s" : ""}.`;
  }

  // ── QUERY: expenses / costs ──
  if ((m.includes("how much") && (m.includes("spent") || m.includes("spend") || m.includes("expense") || m.includes("cost"))) ||
      m === "show me my expenses" || m === "my expenses") {
    const expenses = txs.filter(t => t.type === "expense");
    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
    const topText = top.map((t, i) => `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description}`).join("\n");
    return `Total expenses: ₦${summary.totalExpenses.toLocaleString()} across ${expenses.length} transaction${expenses.length !== 1 ? "s" : ""}.\n\nTop 5 by amount:\n${topText}`;
  }

  // ── QUERY: biggest / largest ──
  if (m.includes("biggest") || m.includes("largest") || m.includes("highest")) {
    const n = m.match(/top\s+(\d+)/)?.[1] ? parseInt(m.match(/top\s+(\d+)/)![1]) : 5;
    const sorted = [...txs].sort((a, b) => b.amount - a.amount).slice(0, n);
    const lines = sorted.map((t, i) => `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description} (${t.type})`).join("\n");
    return `Top ${sorted.length} largest transactions:\n\n${lines}`;
  }

  // ── QUERY: summary / overview / total ──
  if (m === "summary" || m === "overview" || m.includes("give me a summary") || m.includes("show summary") ||
      (m.includes("total") && !m.includes("above") && !m.includes("below"))) {
    return `Summary:\n• Income: ₦${summary.totalIncome.toLocaleString()}\n• Expenses: ₦${summary.totalExpenses.toLocaleString()}\n• Net: ₦${summary.netBalance >= 0 ? "+" : ""}${summary.netBalance.toLocaleString()}\n• Transactions: ${summary.transactionCount}`;
  }

  // ── RULE: mark X as expense/income ──
  const markMatch = m.match(/(?:mark|set|every|all)\s+(.+?)\s+as\s+(income|expense|transfer|cap sales?|revenue|salary)/);
  if (markMatch) {
    const pattern = markMatch[1].replace(/₦[\d,]+\s*/g, "").trim();
    const rawType = markMatch[2].toLowerCase();
    const type = rawType.includes("expense") ? "expense"
      : rawType.includes("income") || rawType.includes("revenue") || rawType.includes("salary") || rawType.includes("cap sales") ? "income"
      : "transfer";
    const affected = txs.filter(t => t.description.toLowerCase().includes(pattern));
    if (affected.length === 0) return `No transactions found matching "${pattern}".`;
    const rule: Rule = { id: Date.now().toString(), description: `Mark "${pattern}" as ${type}`, pattern, action: "set_type", value: type, createdAt: Date.now() };
    return { rule, affectedIds: affected.map(t => t.id), confirmMessage: `Apply to ${affected.length} transaction${affected.length > 1 ? "s" : ""}? All "${pattern}" entries will be marked as ${type}.` } as PendingRule;
  }

  // ── RULE: ignore transfers ──
  if (m.includes("ignore transfer") || m.includes("ignore transfers")) {
    const affected = txs.filter(t => t.type === "transfer");
    if (affected.length === 0) return "No transfers found in your data.";
    const rule: Rule = { id: Date.now().toString(), description: "Ignore all transfers", pattern: "transfer", action: "ignore", value: "unknown", createdAt: Date.now() };
    return { rule, affectedIds: affected.map(t => t.id), confirmMessage: `Ignore ${affected.length} transfer${affected.length > 1 ? "s" : ""}? They'll be excluded from totals.` } as PendingRule;
  }

  // ── RULE: amount-based ──
  const amountRuleMatch = m.match(/every\s+₦?([\d,]+)\s+(?:transaction|entry|payment)\s+is\s+(.+)/);
  if (amountRuleMatch) {
    const amount = parseFloat(amountRuleMatch[1].replace(/,/g, ""));
    const label = amountRuleMatch[2].trim();
    const type = label.includes("expense") ? "expense" : "income";
    const affected = txs.filter(t => t.amount === amount);
    if (affected.length === 0) return `No transactions found for ₦${amount.toLocaleString()}.`;
    const rule: Rule = { id: Date.now().toString(), description: `₦${amount.toLocaleString()} = ${label}`, pattern: amount.toString(), action: "set_type", value: type, createdAt: Date.now() };
    return { rule, affectedIds: affected.map(t => t.id), confirmMessage: `Apply to ${affected.length} transaction${affected.length > 1 ? "s" : ""}? All ₦${amount.toLocaleString()} entries will be marked as ${type}.` } as PendingRule;
  }

  return null; // fall through to AI
}

const SUGGESTIONS = [
  "How much did I make this week?",
  "What are my biggest costs?",
  "Show me my expenses",
  "Ignore all transfers",
];

export const DataChat = ({ transactions, summary, onUpdateTransactions }: DataChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", text: `I've analysed ${summary.transactionCount} transactions. Ask me anything — or give me a rule like "mark all bank charges as expenses".` }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Rule[]>(loadRules);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMessage = (msg: Omit<Message, "id">) =>
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() }]);

  const handleSend = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput("");
    addMessage({ role: "user", text });
    setLoading(true);

    try {
      const intent = parseIntent(text, transactions, summary);

      if (intent === null) {
        // Fall back to AI — send real transaction rows so it can answer precisely
        const { aiRequest } = await import("@/lib/aiClient");
        const txLines = transactions.slice(0, 100).map(t =>
          `${t.date} | ₦${t.amount.toLocaleString()} | ${t.type} | ${t.category} | ${t.description}`
        ).join("\n");
        const systemContext = `You are a financial data query tool. You have access to the user's real transaction data below. Answer ONLY based on this data. Be direct and precise. When listing transactions always include: date, amount, description. If nothing matches say "No transactions found." Never guess or say "it seems like".

TRANSACTION DATA (${transactions.length} rows):
${txLines}

SUMMARY: Income ₦${summary.totalIncome.toLocaleString()} | Expenses ₦${summary.totalExpenses.toLocaleString()} | Net ₦${summary.netBalance.toLocaleString()} | ${summary.transactionCount} transactions`;

        const reply = await aiRequest({
          message: `${systemContext}\n\nUSER QUERY: ${text}`,
          businessType: "general",
        });
        addMessage({ role: "assistant", text: reply });
      } else if (typeof intent === "string") {
        addMessage({ role: "assistant", text: intent });
      } else {
        // Pending rule — show confirmation
        addMessage({ role: "assistant", text: intent.confirmMessage, pending: intent });
      }
    } catch {
      addMessage({ role: "assistant", text: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const confirmRule = (msg: Message) => {
    if (!msg.pending) return;
    const { rule, affectedIds } = msg.pending;

    // Apply to transactions
    const updated = transactions.map(tx => {
      if (!affectedIds.includes(tx.id)) return tx;
      if (rule.action === "set_type") return { ...tx, type: rule.value as ParsedTransaction["type"] };
      if (rule.action === "set_category") return { ...tx, category: rule.value };
      if (rule.action === "ignore") return { ...tx, type: "unknown" as const };
      return tx;
    });
    onUpdateTransactions(updated);

    // Save rule permanently
    const newRules = [...rules.filter(r => r.id !== rule.id), rule];
    setRules(newRules);
    saveRules(newRules);

    // Remove pending from message, show success
    setMessages(prev => prev.map(m =>
      m.id === msg.id ? { ...m, pending: undefined, text: `Done. Applied to ${affectedIds.length} transaction${affectedIds.length > 1 ? "s" : ""}. Rule saved for future uploads.` } : m
    ));
  };

  const dismissRule = (msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, pending: undefined, text: "Got it, no changes made." } : m
    ));
  };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden mb-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-primary/5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Chat with your data</p>
          <p className="text-[10px] text-muted-foreground">Ask questions or give instructions</p>
        </div>
        {rules.length > 0 && (
          <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {rules.length} rule{rules.length > 1 ? "s" : ""} active
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-primary/15" : "bg-muted"}`}>
              {msg.role === "assistant" ? <Bot size={12} className="text-primary" /> : <User size={12} className="text-muted-foreground" />}
            </div>
            <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
              <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                msg.role === "assistant" ? "bg-muted/60 text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"
              }`}>
                {msg.text}
              </div>
              {/* Confirmation buttons */}
              {msg.pending && (
                <div className="flex gap-2">
                  <button onClick={() => confirmRule(msg)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform">
                    Yes, apply
                  </button>
                  <button onClick={() => dismissRule(msg.id)}
                    className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold active:scale-95 transition-transform">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-primary" />
            </div>
            <div className="px-3 py-2 rounded-2xl bg-muted/60 rounded-tl-sm">
              <Loader2 size={12} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2 items-center bg-muted/40 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask anything or give a rule…"
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shrink-0">
            <Send size={12} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataChat;
