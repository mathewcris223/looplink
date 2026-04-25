/**
 * DataChat — Chat with uploaded file data
 */
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import type { ParsedTransaction, StatementSummary } from "@/lib/statementParser";

interface Rule {
  id: string; description: string; pattern: string;
  action: "set_type" | "set_category" | "ignore"; value: string; createdAt: number;
}
interface PendingAction {
  type: "rule" | "select"; rule?: Rule; affectedIds: string[];
  confirmMessage: string; selectMode?: "select" | "deselect";
}
interface Message { id: string; role: "user" | "assistant"; text: string; pending?: PendingAction; }
interface DataChatProps {
  transactions: ParsedTransaction[]; summary: StatementSummary;
  onUpdateTransactions: (updated: ParsedTransaction[]) => void;
  onUpdateSelection?: (ids: Set<string>) => void; selectedIds?: Set<string>;
}

const RULES_KEY = "aje_data_rules";
function loadRules(): Rule[] { try { return JSON.parse(localStorage.getItem(RULES_KEY) ?? "[]"); } catch { return []; } }
function saveRules(r: Rule[]) { localStorage.setItem(RULES_KEY, JSON.stringify(r)); }
function parseAmt(s: string): number { return parseFloat(s.replace(/[₦,\s]/g, "")) || 0; }
function fmtList(txs: ParsedTransaction[], label: string): string {
  if (!txs.length) return "No transactions found" + (label ? " " + label : "") + ".";
  return txs.length + " transaction" + (txs.length > 1 ? "s" : "") + " " + label + ":\n\n" +
    txs.map((t, i) => (i + 1) + ". " + t.date + " — ₦" + t.amount.toLocaleString() + " — " + t.description).join("\n");
}

function parseIntent(msg: string, txs: ParsedTransaction[], summary: StatementSummary): string | PendingAction | null {
  const m = msg.toLowerCase().trim();

  // Selection: only keep above X
  const selAbove = m.match(/(?:only|select|keep)\s+(?:transactions?\s+)?(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (selAbove) {
    const t = parseAmt(selAbove[1]);
    const el = txs.filter(x => x.type === "income" || x.type === "expense");
    const af = el.filter(x => x.amount >= t);
    if (!af.length) return "No transactions above ₦" + t.toLocaleString() + ".";
    return { type: "select", selectMode: "select", affectedIds: af.map(x => x.id), confirmMessage: "Select only " + af.length + " transaction" + (af.length !== 1 ? "s" : "") + " above ₦" + t.toLocaleString() + "? Others will be deselected." };
  }

  // Selection: deselect below X
  const deselBelow = m.match(/(?:remove|deselect|exclude|uncheck)\s+(?:transactions?\s+)?(?:below|under|less than)\s+₦?([\d,]+)/);
  if (deselBelow) {
    const t = parseAmt(deselBelow[1]);
    const el = txs.filter(x => x.type === "income" || x.type === "expense");
    const af = el.filter(x => x.amount < t);
    if (!af.length) return "No transactions below ₦" + t.toLocaleString() + ".";
    return { type: "select", selectMode: "deselect", affectedIds: af.map(x => x.id), confirmMessage: "Deselect " + af.length + " transaction" + (af.length !== 1 ? "s" : "") + " below ₦" + t.toLocaleString() + "?" };
  }

  // Selection: only keep below X
  const selBelow = m.match(/(?:only|select|keep)\s+(?:transactions?\s+)?(?:below|under|less than)\s+₦?([\d,]+)/);
  if (selBelow) {
    const t = parseAmt(selBelow[1]);
    const el = txs.filter(x => x.type === "income" || x.type === "expense");
    const af = el.filter(x => x.amount <= t && x.amount > 0);
    if (!af.length) return "No transactions below ₦" + t.toLocaleString() + ".";
    return { type: "select", selectMode: "select", affectedIds: af.map(x => x.id), confirmMessage: "Select only " + af.length + " transaction" + (af.length !== 1 ? "s" : "") + " below ₦" + t.toLocaleString() + "? Others will be deselected." };
  }

  // Selection: deselect above X
  const deselAbove = m.match(/(?:remove|deselect|exclude|uncheck)\s+(?:transactions?\s+)?(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (deselAbove) {
    const t = parseAmt(deselAbove[1]);
    const el = txs.filter(x => x.type === "income" || x.type === "expense");
    const af = el.filter(x => x.amount > t);
    if (!af.length) return "No transactions above ₦" + t.toLocaleString() + ".";
    return { type: "select", selectMode: "deselect", affectedIds: af.map(x => x.id), confirmMessage: "Deselect " + af.length + " transaction" + (af.length !== 1 ? "s" : "") + " above ₦" + t.toLocaleString() + "?" };
  }

  // Query: above X
  const abv = m.match(/(?:above|over|greater than|more than)\s+₦?([\d,]+)/);
  if (abv) { const t = parseAmt(abv[1]); return fmtList([...txs.filter(x => x.amount >= t)].sort((a, b) => b.amount - a.amount), "above ₦" + t.toLocaleString()); }

  // Query: below X
  const blw = m.match(/(?:below|under|less than)\s+₦?([\d,]+)/);
  if (blw) { const t = parseAmt(blw[1]); return fmtList([...txs.filter(x => x.amount <= t && x.amount > 0)].sort((a, b) => b.amount - a.amount), "below ₦" + t.toLocaleString()); }

  // Query: income
  if (m.includes("how much") && (m.includes("make") || m.includes("earn") || m.includes("income") || m.includes("revenue"))) {
    const inc = txs.filter(x => x.type === "income");
    if (m.includes("week")) { const c = new Date(); c.setDate(c.getDate() - 7); const f = inc.filter(x => new Date(x.date) >= c); return "Income this week: ₦" + f.reduce((s, x) => s + x.amount, 0).toLocaleString() + " across " + f.length + " transaction" + (f.length !== 1 ? "s" : "") + "."; }
    if (m.includes("month")) { const n = new Date(); const f = inc.filter(x => { const d = new Date(x.date); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }); return "Income this month: ₦" + f.reduce((s, x) => s + x.amount, 0).toLocaleString() + " across " + f.length + " transaction" + (f.length !== 1 ? "s" : "") + "."; }
    return "Total income: ₦" + summary.totalIncome.toLocaleString() + " from " + inc.length + " transaction" + (inc.length !== 1 ? "s" : "") + ".";
  }

  // Query: expenses — MUST come before generic "biggest/largest" check
  const isExpQ = (m.includes("how much") && (m.includes("spent") || m.includes("spend") || m.includes("expense") || m.includes("cost")))
    || m === "show me my expenses" || m === "my expenses"
    || m.includes("top expense") || m.includes("biggest expense") || m.includes("largest expense")
    || m.includes("highest expense") || m.includes("most expensive")
    || (m.includes("what") && (m.includes("expense") || m.includes("cost")))
    || (m.includes("my") && m.includes("expense"));
  if (isExpQ) {
    const exp = txs.filter(x => x.type === "expense");
    if (!exp.length) return "No expense transactions found.";
    const n = parseInt(m.match(/top\s+(\d+)/)?.[1] ?? "10");
    const top = [...exp].sort((a, b) => b.amount - a.amount).slice(0, n);
    return "Total expenses: ₦" + summary.totalExpenses.toLocaleString() + " across " + exp.length + " transaction" + (exp.length !== 1 ? "s" : "") + ".\n\nTop expenses:\n" + top.map((t, i) => (i + 1) + ". " + t.date + " — ₦" + t.amount.toLocaleString() + " — " + t.description).join("\n");
  }

  // Query: biggest/largest (all types)
  if (m.includes("biggest") || m.includes("largest") || m.includes("highest")) {
    const n = parseInt(m.match(/top\s+(\d+)/)?.[1] ?? "5");
    const sorted = [...txs].sort((a, b) => b.amount - a.amount).slice(0, n);
    return "Top " + sorted.length + " largest:\n\n" + sorted.map((t, i) => (i + 1) + ". " + t.date + " — ₦" + t.amount.toLocaleString() + " — " + t.description + " (" + t.type + ")").join("\n");
  }

  // Query: show by keyword
  const showM = m.match(/(?:show|list|find|get)\s+(?:me\s+)?(?:all\s+)?(.+?)(?:\s+transactions?)?$/);
  if (showM && !m.includes("how much") && !m.includes("total") && !m.includes("expense") && !m.includes("cost")) {
    const kw = showM[1].trim();
    const typeMap: Record<string, ParsedTransaction["type"]> = { income: "income", expense: "expense", expenses: "expense", transfer: "transfer", transfers: "transfer" };
    if (typeMap[kw]) return fmtList(txs.filter(x => x.type === typeMap[kw]), "(" + kw + ")");
    return fmtList(txs.filter(x => x.description.toLowerCase().includes(kw) || x.category.toLowerCase().includes(kw)), "matching \"" + kw + "\"");
  }

  // Query: summary
  if (m === "summary" || m === "overview" || m.includes("give me a summary") || (m.includes("total") && !m.includes("above") && !m.includes("below"))) {
    return "Summary:\n• Income: ₦" + summary.totalIncome.toLocaleString() + "\n• Expenses: ₦" + summary.totalExpenses.toLocaleString() + "\n• Net: ₦" + (summary.netBalance >= 0 ? "+" : "") + summary.netBalance.toLocaleString() + "\n• Transactions: " + summary.transactionCount;
  }

  // Rule: mark X as type
  const markM = m.match(/(?:mark|set|every|all)\s+(.+?)\s+as\s+(income|expense|transfer|revenue|salary)/);
  if (markM) {
    const pattern = markM[1].replace(/₦[\d,]+\s*/g, "").trim();
    const rawType = markM[2].toLowerCase();
    const type = rawType.includes("expense") ? "expense" : (rawType.includes("income") || rawType.includes("revenue") || rawType.includes("salary")) ? "income" : "transfer";
    const affected = txs.filter(x => x.description.toLowerCase().includes(pattern));
    if (!affected.length) return "No transactions found matching \"" + pattern + "\".";
    const rule: Rule = { id: Date.now().toString(), description: "Mark \"" + pattern + "\" as " + type, pattern, action: "set_type", value: type, createdAt: Date.now() };
    return { type: "rule", rule, affectedIds: affected.map(x => x.id), confirmMessage: "Mark " + affected.length + " \"" + pattern + "\" transaction" + (affected.length > 1 ? "s" : "") + " as " + type + "?" };
  }

  // Rule: ignore transfers
  if (m.includes("ignore transfer") || m.includes("ignore transfers")) {
    const affected = txs.filter(x => x.type === "transfer");
    if (!affected.length) return "No transfers found.";
    const rule: Rule = { id: Date.now().toString(), description: "Ignore all transfers", pattern: "transfer", action: "ignore", value: "unknown", createdAt: Date.now() };
    return { type: "rule", rule, affectedIds: affected.map(x => x.id), confirmMessage: "Ignore " + affected.length + " transfer" + (affected.length > 1 ? "s" : "") + "? They'll be excluded from totals." };
  }

  return null;
}

const SUGGESTIONS = ["Show transactions above 100000", "What are my top expenses?", "Only keep transactions above 50000", "Remove transactions below 20000"];

export const DataChat = ({ transactions, summary, onUpdateTransactions, onUpdateSelection, selectedIds }: DataChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "assistant", text: "I've analysed " + summary.transactionCount + " transactions. Ask me anything — e.g. \"what are my top expenses?\" or \"only keep transactions above 100000\"." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<Rule[]>(loadRules);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const addMsg = (msg: Omit<Message, "id">) => setMessages(prev => [...prev, { ...msg, id: Date.now().toString() }]);

  const handleSend = async (text = input.trim()) => {
    if (!text || loading) return;
    setInput("");
    addMsg({ role: "user", text });
    setLoading(true);
    try {
      const intent = parseIntent(text, transactions, summary);
      if (intent === null) {
        const { aiRequest } = await import("@/lib/aiClient");
        const txLines = transactions.slice(0, 100).map(t => t.date + " | ₦" + t.amount.toLocaleString() + " | " + t.type + " | " + t.category + " | " + t.description).join("\n");
        const reply = await aiRequest({
          message: "You are a financial data query tool. Answer ONLY based on this data. Be direct and precise. When listing expenses, only show expense-type transactions. List with: number, date, amount, description. Say 'No transactions found.' if nothing matches.\n\nDATA (" + transactions.length + " rows):\n" + txLines + "\n\nSUMMARY: Income ₦" + summary.totalIncome.toLocaleString() + " | Expenses ₦" + summary.totalExpenses.toLocaleString() + " | Net ₦" + summary.netBalance.toLocaleString() + " | " + summary.transactionCount + " transactions\n\nQUERY: " + text,
          businessType: "general",
        });
        addMsg({ role: "assistant", text: reply });
      } else if (typeof intent === "string") {
        addMsg({ role: "assistant", text: intent });
      } else {
        addMsg({ role: "assistant", text: intent.confirmMessage, pending: intent });
      }
    } catch { addMsg({ role: "assistant", text: "Something went wrong. Try again." }); }
    finally { setLoading(false); }
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
      const nr = [...rules.filter(r => r.id !== rule.id), rule];
      setRules(nr); saveRules(nr);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pending: undefined, text: "Done. Applied to " + affectedIds.length + " transaction" + (affectedIds.length > 1 ? "s" : "") + "." } : m));
    }
    if (type === "select" && onUpdateSelection) {
      const eligible = transactions.filter(t => t.type === "income" || t.type === "expense");
      const aSet = new Set(affectedIds);
      const next = selectMode === "select"
        ? new Set(eligible.filter(t => aSet.has(t.id)).map(t => t.id))
        : new Set([...(selectedIds ?? new Set(eligible.map(t => t.id)))].filter(id => !aSet.has(id)));
      onUpdateSelection(next);
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, pending: undefined, text: "Done. " + next.size + " transaction" + (next.size !== 1 ? "s" : "") + " now selected." } : m));
    }
  };

  const dismissAction = (msgId: string) => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, pending: undefined, text: "Got it, no changes made." } : m));

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
        {rules.length > 0 && <span className="ml-auto text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{rules.length} rule{rules.length > 1 ? "s" : ""} active</span>}
      </div>

      <div className="px-4 py-3 space-y-3 max-h-72 overflow-y-auto">
        {messages.map(msg => (
          <div key={msg.id} className={"flex gap-2.5 " + (msg.role === "user" ? "flex-row-reverse" : "")}>
            <div className={"w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 " + (msg.role === "assistant" ? "bg-primary/15" : "bg-muted")}>
              {msg.role === "assistant" ? <Bot size={12} className="text-primary" /> : <User size={12} className="text-muted-foreground" />}
            </div>
            <div className={"max-w-[80%] " + (msg.role === "user" ? "items-end" : "items-start") + " flex flex-col gap-1.5"}>
              <div className={"px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-line " + (msg.role === "assistant" ? "bg-muted/60 text-foreground rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm")}>
                {msg.text}
              </div>
              {msg.pending && (
                <div className="flex gap-2">
                  <button onClick={() => confirmAction(msg)} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold active:scale-95 transition-transform">Yes, apply</button>
                  <button onClick={() => dismissAction(msg.id)} className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold active:scale-95 transition-transform">Cancel</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><Bot size={12} className="text-primary" /></div>
            <div className="px-3 py-2 rounded-2xl bg-muted/60 rounded-tl-sm"><Loader2 size={12} className="animate-spin text-muted-foreground" /></div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => handleSend(s)} className="text-[11px] px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">{s}</button>
          ))}
        </div>
      )}

      <div className="px-3 pb-3">
        <div className="flex gap-2 items-center bg-muted/40 rounded-xl px-3 py-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} placeholder="Ask anything or control selection…" className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground" />
          <button onClick={() => handleSend()} disabled={!input.trim() || loading} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shrink-0">
            <Send size={12} className="text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataChat;
