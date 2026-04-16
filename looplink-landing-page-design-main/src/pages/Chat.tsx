import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, getInventorySales, Transaction } from "@/lib/db";
import { aiStream, aiRequest, AIMessage } from "@/lib/aiClient";
import { Button } from "@/components/ui/button";
import { Send, Mic, MicOff, Bot, User, AlertCircle, Sparkles } from "lucide-react";

const SUGGESTED_PROMPTS = [
  "How can I increase my profit this month?",
  "What are my biggest expense problems?",
  "Give me a 30-day growth strategy",
  "How does my business compare to industry averages?",
  "What should I stop spending money on?",
];

const SR = typeof window !== "undefined"
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

const Chat = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { sellsGoods, inventoryItems } = useInventory();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem("ll_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [chipMap, setChipMap] = useState<Map<number, string[]>>(new Map());

  const CHIP_PROMPT = `Based on your last response, suggest 2-4 short follow-up questions or actions the user might want. Return ONLY a JSON array of strings, max 8 words each. Always include at least one of: "Give me a step-by-step plan", "Analyze my performance", "Suggest business ideas".`;
  const FALLBACK_CHIPS = ["Give me a step-by-step plan", "Analyze my performance", "Suggest business ideas"];

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    try { setTransactions(await getTransactions(activeBusiness.id, 100)); } catch {}
  }, [activeBusiness]);

  useEffect(() => { load(); }, [load]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist chat history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem("ll_chat_history", JSON.stringify(messages));
    } catch { /* private browsing — ignore */ }
  }, [messages]);

  if (authLoading || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }
  if (!user || !activeBusiness) return null;

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  const generateChips = async (msgIndex: number, lastResponse: string) => {
    try {
      const raw = await aiRequest({
        message: CHIP_PROMPT + `\n\nYour last response was: "${lastResponse.slice(0, 300)}"`,
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
    setChipMap(prev => new Map(prev).set(msgIndex, FALLBACK_CHIPS));
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError("");
    setInput("");

    const userMsg: AIMessage = { role: "user", content: trimmed };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setStreaming(true);

    // Add empty assistant message that we'll stream into
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    abortRef.current = new AbortController();

    try {
      // Build inventory context if user sells goods
      let inventoryContext: import("@/lib/aiClient").InventoryContext | undefined;
      if (sellsGoods && inventoryItems.length > 0) {
        try {
          const sales = activeBusiness ? await getInventorySales(activeBusiness.id) : [];
          const salesByItem: Record<string, number> = {};
          sales.forEach(s => { salesByItem[s.item_id] = (salesByItem[s.item_id] || 0) + s.quantity_sold; });
          inventoryContext = {
            items: inventoryItems.map(item => ({
              name: item.name,
              quantity: item.quantity,
              costPrice: item.cost_price,
              sellingPrice: item.selling_price,
              totalUnitsSold: salesByItem[item.id] || 0,
            })),
          };
        } catch { /* silent — inventory context is non-critical */ }
      }

      const full = await aiStream(
        {
          message: trimmed,
          businessType: activeBusiness.type,
          businessName: activeBusiness.name,
          transactions,
          totalIncome: income,
          totalExpenses: expenses,
          profit,
          mode: "chat",
          inventoryContext,
        },
        messages, // history before this message
        (delta) => {
          setMessages(prev => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === "assistant") {
              copy[copy.length - 1] = { ...last, content: last.content + delta };
            }
            return copy;
          });
        },
        abortRef.current.signal
      );
      setStreaming(false);
      abortRef.current = null;
      const assistantMsgIndex = updatedHistory.length; // index of the assistant message
      generateChips(assistantMsgIndex, full);
      return;
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
      setError(msg);
      // Remove the empty assistant message on error
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[prev.length - 1].content !== ""));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  // Voice input
  const startVoice = () => {
    if (!SR) { setError("Voice input requires Chrome or Edge."); return; }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setInput(text);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
    setListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness} onAddBusiness={() => navigate("/onboarding")}>
      <div className="flex flex-col max-w-3xl mx-auto" style={{ height: "calc(100dvh - 3.5rem)" }}>

        {/* Header */}
        <div className="py-3 md:py-4 shrink-0">
          <h1 className="font-display text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-primary" /> AI Business Chat
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-0.5">{activeBusiness.name} · Ask anything about your business</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-2xl border bg-card p-3 md:p-4 space-y-4 mb-3">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 gap-4 md:gap-6">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-brand flex items-center justify-center">
                <Bot size={26} className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base md:text-lg mb-1">Your AI Business Advisor</h2>
                <p className="text-muted-foreground text-xs md:text-sm max-w-sm">
                  Ask me anything about your business. I have access to your financial data and can give you real, actionable advice.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => sendMessage(p)}
                    className="px-3 py-2 rounded-full border text-xs font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 min-h-[36px]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div key={i} className="flex flex-col">
              <div className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-gradient-brand text-primary-foreground"
                }`}>
                  {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
                </div>
                <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/60 text-foreground rounded-tl-sm"
                }`}>
                  {msg.content === "" && msg.role === "assistant" ? (
                    <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
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
                <div className="flex flex-wrap gap-2 mt-2 ml-10">
                  {chipMap.get(i)!.map((chip, ci) => (
                    <button
                      key={ci}
                      onClick={() => sendMessage(chip)}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-3">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 rounded-2xl border bg-card p-2.5 md:p-3 flex items-end gap-2 mb-1">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your business… (Enter to send)"
            rows={1}
            disabled={streaming}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-28 py-1.5 px-1 leading-relaxed min-h-[36px]"
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
            }}
          />
          <button
            type="button"
            onClick={listening ? stopVoice : startVoice}
            disabled={streaming}
            className={`p-2 rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center ${
              listening ? "bg-red-500 text-white animate-pulse" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          {streaming ? (
            <button
              onClick={stopStreaming}
              className="p-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <span className="w-4 h-4 rounded-sm bg-destructive block" />
            </button>
          ) : (
            <Button
              size="sm"
              variant="hero"
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="rounded-xl px-3 h-11 min-w-[44px]"
            >
              <Send size={16} />
            </Button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground pb-2">
          AI responses are based on your business data. Always verify important decisions.
        </p>
      </div>
    </AppShell>
  );
};

export default Chat;
