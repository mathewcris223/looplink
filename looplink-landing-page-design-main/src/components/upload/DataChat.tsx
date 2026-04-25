/**
 * DataChat — Chat with uploaded file data
 * Supports: queries, selection commands, reclassification rules
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import type { ParsedTransaction, StatementSummary } from "@/lib/statementParser";

interface Rule {
  id: string;
  description: string;
  pattern: string;
  action: "set_type" | "set_category" | "ignore";
  value: string;
  createdAt: number;
}

interface PendingAction {
  type: "rule" | "select";
  rule?: Rule;
  affectedIds: string[];
  confirmMessage: string;
  selectMode?: "select" | "deselect";
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  pending?: PendingAction;
}

interface DataChatProps {
  transactions: ParsedTransaction[];
  summary: StatementSummary;
  onUpdateTransactions: (updated: ParsedTransaction[]) => void;
  onUpdateSelection?: (ids: Set<string>) => void;
  selectedIds?: Set<string>;
}

const RULES_KEY = "aje_data_rules";
function loadRules(): Rule[] {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) ?? "[]"); } catch { return []; }
}
function saveRules(rules: Rule[]) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

// Parse amount from string — handles "100000", "100,000", "₦100,000"
function parseAmount(str: string): number {
  return parseFloat(str.replace(/[₦,\s]/g, "")) || 0;
}

// Show ALL matching transactions (no cap)
function formatTxList(txs: ParsedTransaction[], label: string): string {
  if (txs.length === 0) return `No transactions found${label ? ` ${label}` : ""}.`;
  const lines = txs.map((t, i) =>
    `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description}`
  );
  return `${txs.length} transaction${txs.length > 1 ? "s" : ""} ${label}:\n\n${lines.join("\n")}`;
}

function parseIntent(
  msg: string,
  txs: ParsedTransaction[],
  summary: StatementSummary
): string | PendingAction | null {
  const m = msg.toLowerCase().trim();

  // ── SELECTION: "only keep / select transactions above X" ──
  const selectAbove = m.match(/(?:only|select|keep)\s+(?:transactions?\s+)?(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (selectAbove) {
    const threshold = parseAmount(selectAbove[1]);
    const eligible = txs.filter(t => t.type === "income" || t.type === "expense");
    const affected = eligible.filter(t => t.amount >= threshold);
    if (affected.length === 0) return `No transactions above ₦${threshold.toLocaleString()}.`;
    return {
      type: "select", selectMode: "select", affectedIds: affected.map(t => t.id),
      confirmMessage: `Select only ${affected.length} transaction${affected.length !== 1 ? "s" : ""} above ₦${threshold.toLocaleString()}? Others will be deselected.`
    };
  }

  // ── SELECTION: "remove / deselect transactions below X" ──
  const deselectBelow = m.match(/(?:remove|deselect|exclude|uncheck)\s+(?:transactions?\s+)?(?:below|under|less than)\s+₦?([\d,]+)/);
  if (deselectBelow) {
    const threshold = parseAmount(deselectBelow[1]);
    const eligible = txs.filter(t => t.type === "income" || t.type === "expense");
    const affected = eligible.filter(t => t.amount < threshold);
    if (affected.length === 0) return `No transactions below ₦${threshold.toLocaleString()}.`;
    return {
      type: "select", selectMode: "deselect", affectedIds: affected.map(t => t.id),
      confirmMessage: `Deselect ${affected.length} transaction${affected.length !== 1 ? "s" : ""} below ₦${threshold.toLocaleString()}?`
    };
  }

  // ── SELECTION: "only keep / select transactions below X" ──
  const selectBelow = m.match(/(?:only|select|keep)\s+(?:transactions?\s+)?(?:below|under|less than)\s+₦?([\d,]+)/);
  if (selectBelow) {
    const threshold = parseAmount(selectBelow[1]);
    const eligible = txs.filter(t => t.type === "income" || t.type === "expense");
    const affected = eligible.filter(t => t.amount <= threshold && t.amount > 0);
    if (affected.length === 0) return `No transactions below ₦${threshold.toLocaleString()}.`;
    return {
      type: "select", selectMode: "select", affectedIds: affected.map(t => t.id),
      confirmMessage: `Select only ${affected.length} transaction${affected.length !== 1 ? "s" : ""} below ₦${threshold.toLocaleString()}? Others will be deselected.`
    };
  }

  // ── SELECTION: "remove / deselect transactions above X" ──
  const deselectAbove = m.match(/(?:remove|deselect|exclude|uncheck)\s+(?:transactions?\s+)?(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (deselectAbove) {
    const threshold = parseAmount(deselectAbove[1]);
    const eligible = txs.filter(t => t.type === "income" || t.type === "expense");
    const affected = eligible.filter(t => t.amount > threshold);
    if (affected.length === 0) return `No transactions above ₦${threshold.toLocaleString()}.`;
    return {
      type: "select", selectMode: "deselect", affectedIds: affected.map(t => t.id),
      confirmMessage: `Deselect ${affected.length} transaction${affected.length !== 1 ? "s" : ""} above ₦${threshold.toLocaleString()}?`
    };
  }

  // ── QUERY: amount filter — "show transactions above X" ──
  const aboveMatch = m.match(/(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (aboveMatch) {
    const threshold = parseAmount(aboveMatch[1]);
    const filtered = [...txs.filter(t => t.amount >= threshold)].sort((a, b) => b.amount - a.amount);
    return formatTxList(filtered, `above ₦${threshold.toLocaleString()}`);
  }

  // ── QUERY: amount filter — "show transactions below X" ──
  const belowMatch = m.match(/(?:below|under|less than)\s+₦?([\d,]+)/);
  if (belowMatch) {
    const threshold = parseAmount(belowMatch[1]);
    const filtered = [...txs.filter(t => t.amount <= threshold && t.amount > 0)].sort((a, b) => b.amount - a.amount);
    return formatTxList(filtered, `below ₦${threshold.toLocaleString()}`);
  }

  // ── QUERY: show by keyword/type ──
  const showMatch = m.match(/(?:show|list|find|get)\s+(?:me\s+)?(?:all\s+)?(.+?)(?:\s+transactions?)?$/);
  if (showMatch && !m.includes("how much") && !m.includes("total")) {
    const keyword = showMatch[1].trim();
    const typeMap: Record<string, ParsedTransaction["type"]> = { income: "income", expense: "expense", expenses: "expense", transfer: "transfer", transfers: "transfer" };
    if (typeMap[keyword]) {
      return formatTxList(txs.filter(t => t.type === typeMap[keyword]), `(${keyword})`);
    }
    const filtered = txs.filter(t =>
      t.description.toLowerCase().includes(keyword) || t.category.toLowerCase().includes(keyword)
    );
    return formatTxList(filtered, `matching "${keyword}"`);
  }

  // ── QUERY: income ──
  if (m.includes("how much") && (m.includes("make") || m.includes("earn") || m.includes("income") || m.includes("revenue"))) {
    const income = txs.filter(t => t.type === "income");
    if (m.includes("week")) {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
      const filtered = income.filter(t => new Date(t.date) >= cutoff);
      return `Income this week: ₦${filtered.reduce((s, t) => s + t.amount, 0).toLocaleString()} across ${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}.`;
    }
    if (m.includes("month")) {
      const now = new Date();
      const filtered = income.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      return `Income this month: ₦${filtered.reduce((s, t) => s + t.amount, 0).toLocaleString()} across ${filtered.length} transaction${filtered.length !== 1 ? "s" : ""}.`;
    }
    return `Total income: ₦${summary.totalIncome.toLocaleString()} from ${income.length} transaction${income.length !== 1 ? "s" : ""}.`;
  }

  // ── QUERY: expenses ──
  if ((m.includes("how much") && (m.includes("spent") || m.includes("spend") || m.includes("expense") || m.includes("cost"))) ||
      m === "show me my expenses" || m === "my expenses") {
    const expenses = txs.filter(t => t.type === "expense");
    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5);
    return `Total expenses: ₦${summary.totalExpenses.toLocaleString()} across ${expenses.length} transaction${expenses.length !== 1 ? "s" : ""}.\n\nTop 5:\n${top.map((t, i) => `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description}`).join("\n")}`;
  }

  // ── QUERY: biggest ──
  if (m.includes("biggest") || m.includes("largest") || m.includes("highest")) {
    const n = parseInt(m.match(/top\s+(\d+)/)?.[1] ?? "5");
    const sorted = [...txs].sort((a, b) => b.amount - a.amount).slice(0, n);
    return `Top ${sorted.length} largest:\n\n${sorted.map((t, i) => `${i + 1}. ${t.date} — ₦${t.amount.toLocaleString()} — ${t.description} (${t.type})`).join("\n")}`;
  }

  // ── QUERY: summary ──
  if (m === "summary" || m === "overview" || m.includes("give me a summary") ||
      (m.includes("total") && !m.includes("above") && !m.includes("below"))) {
    return `Summary:\n• Income: ₦${summary.totalIncome.toLocaleString()}\n• Expenses: ₦${summary.totalExpenses.toLocaleString()}\n• Net: ₦${summary.netBalance >= 0 ? "+" : ""}${summary.netBalance.toLocaleString()}\n• Transactions: ${summary.transactionCount}`;
  }

  // ── RULE: mark X as type ──
  const markMatch = m.match(/(?:mark|set|every|all)\s+(.+?)\s+as\s+(income|expense|transfer|revenue|salary)/);
  if (markMatch) {
    const pattern = markMatch[1].replace(/₦[\d,]+\s*/g, "").trim();
    const rawType = markMatch[2].toLowerCase();
    const type = rawType.includes("expense") ? "expense"
      : rawType.includes("income") || rawType.includes("revenue") || rawType.includes("salary") ? "income"
      : "transfer";
    const affected = txs.filter(t => t.description.toLowerCase().includes(pattern));
    if (affected.length === 0) return `No transactions found matching "${pattern}".`;
    const rule: Rule = { id: Date.now().toString(), description: `Mark "${pattern}" as ${type}`, pattern, action: "set_type", value: type, createdAt: Date.now() };
    return { type: "rule", rule, affectedIds: affected.map(t => t.id), confirmMessage: `Mark ${affected.length} "${pattern}" transaction${affected.length > 1 ? "s" : ""} as ${type}?` };
  }

  // ── RULE: ignore transfers ──
  if (m.includes("ignore transfer") || m.includes("ignore transfers")) {
    const affected = txs.filter(t => t.type === "transfer");
    if (affected.length === 0) return "No transfers found.";
    const rule: Rule = { id: Date.now().toString(), description: "Ignore all transfers", pattern: "transfer", action: "ignore", value: "unknown", createdAt: Date.now() };
    return { type: "rule", rule, affectedIds: affected.map(t => t.id), confirmMessage: `Ignore ${affected.length} transfer${affected.length > 1 ? "s" : ""}? They'll be excluded from totals.` };
  }

  return null;
}

const SUGGESTIONS = [
  "Show transactions above 100000",
  "Only keep transactions above 50000",
  "Remove transactions below 20000",
  "What are my biggest costs?",
];

export const DataChat = ({ transactions, summary, onUpdateTransactions, onUpdateSelection, selectedIds }: DataChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", text: `I've analysed ${summary.transactionCount} transactions. Ask me anything, or tell me what to select — e.g. "only keep transactions above 100000" or "remove transactions below 20000".` }
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
        const { aiRequest } = await import("@/lib/aiClient");
        const txLines = transactions.slice(0, 100).map(t =>
          `${t.date} | ₦${t.amount.toLocaleString()} | ${t.type} | ${t.category} | ${t.description}`
        ).join("\n");
        const reply = await aiRequest({
          message: `You are a financial data query tool. Answer ONLY based on this data. Be direct. List transactions with date, amount, description. Say "No transactions found." if nothing matches. Never guess.\n\nDATA (${transactions.length} rows):\n${txLines}\n\nSUMMARY: Income ₦${summary.totalIncome.toLocaleString()} | Expenses ₦${summary.totalExpenses.toLocaleString()} | Net ₦${summary.netBalance.toLocaleString()} | ${summary.transactionCount} transactions\n\nQUERY: ${text}`,
          businessType: "general",
        });
        addMessage({ role: "assistant", text: reply });
      } else if (typeof intent === "string") {
        addMessage({ role: "assistant", text: intent });
      } else {
        addMessage({ role: "assistant", text: intent.confirmMessage, pending: intent });
      }
    } catch {
      addMessage({ role: "assistant", text: "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = (msg: Message) => {
    if (!msg.pending) return;
    const { type, rule, affectedIds, selectMode } = msg.pending;

    if (type === "rule" && rule) {
      const updated = transactions.map(tx => {
        if (!affectedIds.includes(tx.id)) return tx;
        if (rule.action === "set_type") return { ...tx, type: rule.value as ParsedTransaction["type"] };
        if (rule.action === "set_category") return { ...tx, category: rule.value };
        if (rule.action === "ignore") return { ...tx, type: "unknown" as const };
        return tx;
      });
      onUpdateTransactions(updated);
      const newRules = [...rules.filter(r => r.id !== rule.id), rule];
      setRules(newRules);
      saveRules(newRules);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, pending: undefined, text: `Done. Applied to ${affectedIds.length} transaction${affectedIds.length > 1 ? "s" : ""}.` } : m
      ));
    }

    if (type === "select" && onUpdateSelection) {
      const eligible = transactions.filter(t => t.type === "income" || t.type === "expense");
      const affectedSet = new Set(affectedIds);
      let next: Set<string>;
      if (selectMode === "select") {
        // Keep only the matching ones
        next = new Set(eligible.filter(t => affectedSet.has(t.id)).map(t => t.id));
      } else {
        // Remove matching ones from current selection
        const current = selectedIds ?? new Set(eligible.map(t => t.id));
        next = new Set([...current].filter(id => !affectedSet.has(id)));
      }
      onUpdateSelection(next);
      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, pending: undefined, text: `Done. ${next.size} transaction${next.size !== 1 ? "s" : ""} now selected.` } : m
      ));
    }
  };

  const dismissAction = (msgId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, pending: undefined, text: "Got it, no changes made." } : m
    ));
  };

  return (
    <div className="bg-card border rounded-2xl overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-primary/5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold">Chat with your data</p>
          <p className="text-[10px] text-muted-foreground">Ask questions or control which transactions to save</p>
        </div>
        {rules.length > 0 && (
          <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {rules.length} rule{rules.length > 1 ? "s" : ""} active
          </span>
        )}
      </div>

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
              {msg.pending && (
                <div className="flex gap-2">
                  <button onClick={() => confirmAction(msg)}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform">
                    Yes, apply
                  </button>
                  <button onClick={() => dismissAction(msg.id)}
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

      <div className="px-3 pb-3">
        <div className="flex gap-2 items-center bg-muted/40 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask anything or control selection…"
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
