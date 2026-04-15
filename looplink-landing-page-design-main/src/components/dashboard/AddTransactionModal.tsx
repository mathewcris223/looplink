import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { addTransaction } from "@/lib/db";
import { parseVoiceInput, ParsedTransaction } from "@/lib/voiceParser";
import { X, Mic, MicOff, CheckCircle2, Edit3, AlertCircle } from "lucide-react";

const EXPENSE_CATEGORIES = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];
const INCOME_CATEGORIES = ["Product Sale", "Service", "Commission", "Other"];

type VoiceState = "idle" | "listening" | "processing" | "preview" | "error";

interface Props {
  businessId: string;
  defaultType: "income" | "expense";
  onClose: () => void;
  onSaved: () => void;
}

const AddTransactionModal = ({ businessId, defaultType, onClose, onSaved }: Props) => {
  // Form state
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [editingIdx, setEditingIdx] = useState(0);
  const recognitionRef = useRef<any>(null);

  const categories = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const SR = typeof window !== "undefined"
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

  // ── Start listening ──────────────────────────────────────────────────────
  const startListening = () => {
    if (!SR) {
      setVoiceError("Voice input is not supported in this browser. Please use Chrome.");
      setVoiceState("error");
      return;
    }

    setVoiceError("");
    setTranscript("");
    setParsed([]);
    setVoiceState("listening");

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.continuous = false;

    recognition.onresult = (e: any) => {
      // Show interim transcript live
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      if (voiceState === "listening") processTranscript();
    };

    recognition.onerror = (e: any) => {
      recognitionRef.current = null;
      if (e.error === "no-speech") {
        setVoiceError("No speech detected. Please try again.");
      } else if (e.error === "not-allowed") {
        setVoiceError("Microphone access denied. Please allow microphone in your browser settings.");
      } else {
        setVoiceError("Could not capture audio. Please try again.");
      }
      setVoiceState("error");
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    processTranscript();
  };

  // ── Process transcript ───────────────────────────────────────────────────
  const processTranscript = () => {
    setVoiceState("processing");
    setTimeout(() => {
      const text = transcript.trim();
      if (!text) {
        setVoiceError("Sorry, we couldn't understand. Please try again.");
        setVoiceState("error");
        return;
      }

      const result = parseVoiceInput(text);

      if (result.transactions.length === 0) {
        setVoiceError(`We heard: "${text}" — but couldn't find any amounts or transaction details. Try saying something like "I sold 50k worth of shoes".`);
        setVoiceState("error");
        return;
      }

      setParsed(result.transactions);
      setEditingIdx(0);
      // Pre-fill form with first parsed transaction
      applyParsed(result.transactions[0]);
      setVoiceState("preview");
    }, 800);
  };

  const applyParsed = (tx: ParsedTransaction) => {
    setType(tx.type);
    setAmount(String(tx.amount));
    setDescription(tx.description);
    setCategory(tx.category);
  };

  const resetVoice = () => {
    setVoiceState("idle");
    setTranscript("");
    setVoiceError("");
    setParsed([]);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!description.trim()) { setError("Enter a description."); return; }
    if (!category) { setError("Select a category."); return; }
    setLoading(true);
    try {
      await addTransaction(businessId, type, parseFloat(amount), description.trim(), category);
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* ── VOICE SECTION ── */}
        <div className="mb-5">
          {voiceState === "idle" && (
            <button
              type="button"
              onClick={startListening}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mic size={18} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-primary">Speak to fill form</p>
                <p className="text-xs text-muted-foreground">e.g. "I sold 50k worth of shoes"</p>
              </div>
            </button>
          )}

          {voiceState === "listening" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Mic size={18} className="text-white" />
                  </div>
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-60" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-red-700">Listening…</p>
                  <p className="text-xs text-red-500">Speak clearly into your microphone</p>
                </div>
              </div>
              {transcript && (
                <p className="text-xs text-red-700 bg-red-100 rounded-xl px-3 py-2 italic">"{transcript}"</p>
              )}
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center gap-1.5 mx-auto text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                <MicOff size={13} /> Stop listening
              </button>
            </div>
          )}

          {voiceState === "processing" && (
            <div className="rounded-2xl border bg-muted/40 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold">Processing speech…</p>
                {transcript && <p className="text-xs text-muted-foreground italic mt-0.5">"{transcript}"</p>}
              </div>
            </div>
          )}

          {voiceState === "preview" && parsed.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={15} />
                  <p className="text-xs font-bold uppercase tracking-wide">Voice detected</p>
                </div>
                <button type="button" onClick={resetVoice} className="text-xs text-emerald-600 hover:underline">
                  Re-record
                </button>
              </div>
              <p className="text-xs text-emerald-700 italic">"{transcript}"</p>

              {/* If multiple transactions detected */}
              {parsed.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-700">Multiple transactions detected — select one:</p>
                  {parsed.map((tx, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setEditingIdx(i); applyParsed(tx); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                        editingIdx === i ? "bg-emerald-200 text-emerald-900 font-semibold" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()} · {tx.description} · {tx.category}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Edit3 size={11} />
                Form filled below — review and edit before saving
              </div>
            </div>
          )}

          {voiceState === "error" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={15} />
                <p className="text-xs font-bold">Couldn't understand</p>
              </div>
              <p className="text-xs text-amber-700">{voiceError}</p>
              <button
                type="button"
                onClick={startListening}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                <Mic size={12} /> Try again
              </button>
            </div>
          )}
        </div>

        {/* ── FORM ── */}
        {/* Type toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-5">
          {(["income", "expense"] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (₦)</label>
            <input
              type="number" min="0" placeholder="e.g. 15000"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {type === "income" ? "What was sold / source" : "What was it for"}
            </label>
            <input
              type="text"
              placeholder={type === "income" ? "e.g. Sold 10 bags" : "e.g. Bought stock"}
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>
          )}

          <Button
            type="submit"
            variant="hero"
            size="lg"
            disabled={loading}
            className="w-full rounded-xl"
          >
            {loading ? "Saving…" : `Save ${type === "income" ? "Income" : "Expense"}`}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
