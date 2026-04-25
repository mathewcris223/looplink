import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, getInventorySales, Transaction } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { aiStream, aiRequest, AIMessage } from "@/lib/aiClient";
import { Button } from "@/components/ui/button";
import { Send, Mic, MicOff, Bot, User, AlertCircle, Sparkles, Plus, Search, Trash2, History, X } from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const SR = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

const SUGGESTED_PROMPTS = [
  "How can I increase my profit?",
  "What are my biggest expenses?",
  "Give me a 30-day growth plan",
  "How do I reduce my costs?",
];

interface ConversationListProps {
  filteredConvs: Conversation[];
  activeConvId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewChat: () => void;
  onSelect: (conv: Conversation) => void;
  onDelete: (convId: string, e: React.MouseEvent) => void;
}

function ConversationList({
  filteredConvs, activeConvId, searchQuery,
  onSearchChange, onNewChat, onSelect, onDelete,
}: ConversationListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <button onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={15} /> New Chat
        </button>
      </div>
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="w-full rounded-lg bg-muted/50 pl-8 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30"
            placeholder="Search conversations..."
            value={searchQuery} onChange={e => onSearchChange(e.target.value)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredConvs.length === 0 ? (
          <div className="text-center py-6 px-3">
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            {searchQuery && (
              <button onClick={() => onSearchChange("")} className="text-xs text-primary hover:underline mt-1">
                Clear search
              </button>
            )}
          </div>
        ) : filteredConvs.map(conv => (
          <button key={conv.id} onClick={() => onSelect(conv)}
            className={`w-full text-left px-3 py-3 rounded-xl transition-all group flex items-start justify-between gap-2 ${
              activeConvId === conv.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
            }`}>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium leading-snug line-clamp-2 ${activeConvId === conv.id ? "text-primary" : "text-foreground"}`}>
                {conv.title}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(conv.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
            </div>
            <button onClick={e => onDelete(conv.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-500 text-muted-foreground transition-all shrink-0">
              <Trash2 size={11} />
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { inventoryItems } = useInventory();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventorySales, setInventorySales] = useState<import("@/lib/db").InventorySale[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [chipMap, setChipMap] = useState<Map<number, string[]>>(new Map());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [convLoading, setConvLoading] = useState(false);
  const [messageCache, setMessageCache] = useState<Record<string, AIMessage[]>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    // Only load last 30 days of transactions for AI context — keeps payload small
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    try {
      const [txData, salesData] = await Promise.all([
        supabase.from("transactions").select("*").eq("business_id", activeBusiness.id).gte("created_at", thirtyDaysAgo.toISOString()).order("created_at", { ascending: false }).limit(50),
        getInventorySales(activeBusiness.id),
      ]);
      setTransactions((txData.data ?? []) as Transaction[]);
      setInventorySales(salesData);
    } catch {}
  }, [activeBusiness]);
  useEffect(() => { load(); }, [load]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    setConversations((data ?? []) as Conversation[]);
  }, [user]);
  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setConvLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as AIMessage[]);
    setMessageCache(prev => ({ ...prev, [convId]: (data ?? []) as AIMessage[] }));
    setConvLoading(false);
  }, []);

  const selectConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    loadMessages(conv.id);
    setShowHistory(false);
    setChipMap(new Map());
  };

  const startNewConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setChipMap(new Map());
    setShowHistory(false);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    await supabase.from("chat_conversations").delete().eq("id", convId);
    if (activeConvId === convId) startNewConversation();
    loadConversations();
  };

  const saveMessage = async (convId: string, role: "user" | "assistant", content: string) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({ conversation_id: convId, user_id: user.id, role, content });
  };

  const ensureConversation = async (firstMessage: string): Promise<string> => {
    if (activeConvId) return activeConvId;
    if (!user || !activeBusiness) throw new Error("Not authenticated");
    const title = firstMessage.length > 60 ? firstMessage.slice(0, 60) + "…" : firstMessage;
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, business_id: activeBusiness.id, title })
      .select("id").single();
    if (error) throw error;
    const newId = data.id as string;
    setActiveConvId(newId);
    loadConversations();
    return newId;
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  const generateChips = async (msgIndex: number, userQuestion: string, aiResponse: string) => {
    try {
      const raw = await aiRequest({
        message: `User asked: "${userQuestion.slice(0, 200)}"\nYour response: "${aiResponse.slice(0, 400)}"\n\nGenerate 3 short follow-up questions (under 10 words each, specific to this topic). Return ONLY a JSON array of 3 strings.`,
        businessType: activeBusiness.type,
        businessName: activeBusiness.name,
        mode: "chat",
      });
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const chips = JSON.parse(match[0]) as string[];
        if (Array.isArray(chips) && chips.length >= 2) {
          setChipMap(prev => new Map(prev).set(msgIndex, chips.slice(0, 4)));
          return;
        }
      }
    } catch { /* silent */ }
    const q = userQuestion.toLowerCase();
    let fallback: string[];
    if (q.includes("expens") || q.includes("cost")) fallback = ["Which expense is highest?", "How do I reduce this?", "Show me a budget plan"];
    else if (q.includes("profit") || q.includes("income")) fallback = ["How can I increase this?", "What affects my margin?", "Compare to last month"];
    else if (q.includes("stock") || q.includes("inventory")) fallback = ["Which product sells most?", "When should I restock?", "How do I price better?"];
    else fallback = ["Give me a step-by-step plan", "What are the risks?", "How do I start?"];
    setChipMap(prev => new Map(prev).set(msgIndex, fallback));
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setError(""); setInput("");
    const userMsg: AIMessage = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setStreaming(true);
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    abortRef.current = new AbortController();
    try {
      const convId = await ensureConversation(trimmed);
      await saveMessage(convId, "user", trimmed);

      let inventoryContext: import("@/lib/aiClient").InventoryContext | undefined;
      if (inventoryItems.length > 0) {
        try {
          // Compute monthly context for richer AI responses
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

          const monthlyIncome = transactions.filter(t => t.type === "income" && new Date(t.created_at) >= monthStart).reduce((s, t) => s + t.amount, 0);
          const monthlyExpenses = transactions.filter(t => t.type === "expense" && new Date(t.created_at) >= monthStart).reduce((s, t) => s + t.amount, 0);
          const monthlyProfit = monthlyIncome - monthlyExpenses;

          const prevMonthIncome = transactions.filter(t => t.type === "income" && new Date(t.created_at) >= prevMonthStart && new Date(t.created_at) < monthStart).reduce((s, t) => s + t.amount, 0);
          const profitTrend: "up" | "down" | "flat" = monthlyIncome > prevMonthIncome ? "up" : monthlyIncome < prevMonthIncome ? "down" : "flat";

          // Top 5 inventory items by units sold
          const topInventoryItems = inventoryItems
            .map(item => {
              const sold = inventorySales.filter(s => s.item_id === item.id).reduce((s, sale) => s + sale.quantity_sold, 0);
              const revenue = inventorySales.filter(s => s.item_id === item.id).reduce((s, sale) => s + sale.quantity_sold * sale.sale_price_per_unit, 0);
              return { name: item.name, unitsSold: sold, revenue };
            })
            .sort((a, b) => b.unitsSold - a.unitsSold)
            .slice(0, 5);

          const lowStockItems = inventoryItems
            .filter(i => i.status === "low_stock" || i.status === "out_of_stock")
            .map(i => ({ name: i.name, quantity: i.quantity ?? 0 }));

          const totalInventoryValue = inventoryItems
            .filter(i => i.item_type !== "service")
            .reduce((s, i) => s + (i.quantity ?? 0) * (i.cost_price ?? 0), 0);

          inventoryContext = {
            items: inventoryItems.map(item => ({
              name: item.name,
              itemType: item.item_type,
              quantity: item.quantity,
              costPrice: item.cost_price,
              sellingPrice: item.selling_price,
              totalUnitsSold: inventorySales.filter(s => s.item_id === item.id).reduce((s, sale) => s + sale.quantity_sold, 0),
              totalLosses: 0,
              isDeadStock: !inventorySales.some(s => s.item_id === item.id && new Date(s.created_at) >= new Date(Date.now() - 30 * 86400000)),
              isLowStock: item.status === "low_stock",
              status: item.status,
            })),
          };

          void monthlyProfit; void profitTrend; void topInventoryItems; void lowStockItems; void totalInventoryValue;
        } catch { /* silent */ }
      }

      const full = await aiStream(
        { message: trimmed, businessType: activeBusiness.type, businessName: activeBusiness.name, transactions, totalIncome: income, totalExpenses: expenses, profit, mode: "chat", inventoryContext },
        messages,
        (delta) => {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: last.content + delta };
            return copy;
          });
        },
        abortRef.current.signal
      );

      await saveMessage(convId, "assistant", full);
      await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      setStreaming(false);
      abortRef.current = null;
      generateChips(updatedHistory.length, trimmed, full);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[prev.length - 1].content !== ""));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const stopStreaming = () => { abortRef.current?.abort(); setStreaming(false); };

  const startVoice = () => {
    if (!SR) { setError("Voice input requires Chrome or Edge."); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US"; rec.interimResults = false;
    rec.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start(); setListening(true);
  };
  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  const filteredConvs = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (c.title.toLowerCase().includes(q)) return true;
    const msgs = messageCache[c.id] ?? [];
    return msgs.some(m => m.content.toLowerCase().includes(q));
  });

  const activeTitle = activeConvId
    ? (conversations.find(c => c.id === activeConvId)?.title ?? "Chat")
    : "New Chat";

  const convListProps: ConversationListProps = {
    filteredConvs,
    activeConvId,
    searchQuery,
    onSearchChange: setSearchQuery,
    onNewChat: startNewConversation,
    onSelect: selectConversation,
    onDelete: deleteConversation,
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness}
      onSelectBusiness={setActiveBusiness}>

      {/* Mobile history bottom sheet */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
          <div className="relative bg-card rounded-t-3xl shadow-2xl max-h-[80dvh] flex flex-col animate-fade-up">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-muted" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
              <h3 className="font-display font-bold text-base">Chat History</h3>
              <button onClick={() => setShowHistory(false)} className="p-2 rounded-xl hover:bg-muted min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList {...convListProps} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop: sidebar + chat */}
      <div className="hidden md:flex gap-4 max-w-5xl mx-auto" style={{ height: "calc(100dvh - 3.5rem)" }}>
        <div className="w-64 shrink-0 rounded-2xl border bg-card overflow-hidden">
          <ConversationList {...convListProps} />
        </div>
        <ChatMain
          activeTitle={activeTitle} messages={messages} streaming={streaming}
          error={error} input={input} setInput={setInput} listening={listening}
          chipMap={chipMap} convLoading={convLoading} bottomRef={bottomRef} inputRef={inputRef}
          sendMessage={sendMessage} handleKeyDown={handleKeyDown} stopStreaming={stopStreaming}
          startVoice={startVoice} stopVoice={stopVoice}
          onShowHistory={() => setShowHistory(true)} showHistoryBtn={false}
        />
      </div>

      {/* Mobile: full screen chat */}
      <div className="flex flex-col md:hidden" style={{ height: "calc(100dvh - 3.5rem)" }}>
        <ChatMain
          activeTitle={activeTitle} messages={messages} streaming={streaming}
          error={error} input={input} setInput={setInput} listening={listening}
          chipMap={chipMap} convLoading={convLoading} bottomRef={bottomRef} inputRef={inputRef}
          sendMessage={sendMessage} handleKeyDown={handleKeyDown} stopStreaming={stopStreaming}
          startVoice={startVoice} stopVoice={stopVoice}
          onShowHistory={() => setShowHistory(true)} showHistoryBtn={true}
        />
      </div>
    </AppShell>
  );
}

interface ChatMainProps {
  activeTitle: string;
  messages: AIMessage[];
  streaming: boolean;
  error: string;
  input: string;
  setInput: (v: string) => void;
  listening: boolean;
  chipMap: Map<number, string[]>;
  convLoading: boolean;
  bottomRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLTextAreaElement>;
  sendMessage: (text: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  stopStreaming: () => void;
  startVoice: () => void;
  stopVoice: () => void;
  onShowHistory: () => void;
  showHistoryBtn: boolean;
}

function ChatMain({
  activeTitle, messages, streaming, error, input, setInput,
  listening, chipMap, convLoading, bottomRef, inputRef,
  sendMessage, handleKeyDown, stopStreaming, startVoice, stopVoice,
  onShowHistory, showHistoryBtn,
}: ChatMainProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 py-3">
        {showHistoryBtn && (
          <button onClick={onShowHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-card text-xs font-semibold hover:bg-muted transition-colors min-h-[40px] shrink-0">
            <History size={15} />
            <span>History</span>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-bold text-base flex items-center gap-2 leading-tight">
            <Sparkles size={16} className="text-primary shrink-0" />
            <span className="break-words">{activeTitle}</span>
          </h1>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto rounded-2xl border bg-card p-3 md:p-4 mb-3 space-y-3">
        {convLoading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {!convLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <Bot size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base mb-1">Your AI Business Advisor</h2>
              <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                Ask anything about your business. I have access to your financial data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center w-full max-w-sm">
              {SUGGESTED_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="px-3 py-2 rounded-full border text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all min-h-[36px]">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col">
            <div className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-brand text-primary-foreground"
              }`}>
                {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              </div>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/60 text-foreground rounded-tl-sm"
              }`}>
                {msg.content === "" && msg.role === "assistant" ? (
                  <span className="flex items-center gap-1.5 text-muted-foreground text-xs py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                ) : (
                  <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                )}
              </div>
            </div>
            {msg.role === "assistant" && msg.content && !streaming && chipMap.get(i) && (
              <div className="flex flex-wrap gap-2 mt-2 ml-9">
                {chipMap.get(i)!.map((chip, ci) => (
                  <button key={ci} onClick={() => sendMessage(chip)}
                    className="px-3 py-1.5 rounded-full border text-xs font-medium bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all break-words text-left">
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-3">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            <span className="break-words">{error}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 rounded-2xl border bg-card p-2.5 flex items-end gap-2 mb-1">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your business…"
          rows={1}
          disabled={streaming}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-32 py-2 px-1 leading-relaxed"
          style={{ minHeight: "40px" }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
        />
        <button type="button" onClick={listening ? stopVoice : startVoice} disabled={streaming}
          className={`p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 ${
            listening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}>
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {streaming ? (
          <button onClick={stopStreaming}
            className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
            <span className="w-4 h-4 rounded-sm bg-destructive block" />
          </button>
        ) : (
          <Button size="sm" variant="hero" onClick={() => sendMessage(input)} disabled={!input.trim()}
            className="rounded-xl px-3 h-11 min-w-[44px] shrink-0">
            <Send size={16} />
          </Button>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground pb-2 px-2">
        AI responses are based on your business data. Always verify important decisions.
      </p>
    </div>
  );
}
