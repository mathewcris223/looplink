import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { addTransaction } from "@/lib/db";
import { parseVoiceInput, ParsedTransaction } from "@/lib/voiceParser";
import { X, Mic, MicOff, CheckCircle2, Edit3, AlertCircle } from "lucide-react";

const EXPENSE_CATEGORIES = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];
const INCOME_CATEGORIES = ["Product Sale", "Service", "Commission", "Other"];
type VoiceState = "idle" | "listening" | "hearing" | "processing" | "preview" | "error";

interface Props {
  businessId: string;
  defaultType: "income" | "expense";
  onClose: () => void;
  onSaved: () => void;
}

// Animated waveform reacting to mic volume
const WaveformBars = ({ active, volume }: { active: boolean; volume: number }) => (
  <div className="flex items-center gap-0.5 h-6">
    {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4].map((base, i) => (
      <div
        key={i}
        className="w-1 rounded-full bg-red-500 transition-all duration-75"
        style={{
          height: active ? `${Math.max(4, base * volume * 24)}px` : "4px",
          opacity: active ? 0.7 + base * 0.3 : 0.3,
        }}
      />
    ))}
  </div>
);

const AddTransactionModal = ({ businessId, defaultType, onClose, onSaved }: Props) => {
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [editingIdx, setEditingIdx] = useState(0);
  const [volume, setVolume] = useState(0);

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");
  const processedRef = useRef(false);
  const hasHeardRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalAccRef = useRef("");

  const SR = typeof window !== "undefined"
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null;

  const cleanupAudio = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    setVolume(0);
  };

  useEffect(() => () => { cleanupAudio(); recognitionRef.current?.stop(); }, []);

  const startVolumeMeter = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true, // boosts sensitivity at distance
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        const norm = Math.min(1, avg / 40);
        setVolume(norm);

        if (norm > 0.08) {
          hasHeardRef.current = true;
          setVoiceState("hearing");
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            if (hasHeardRef.current) recognitionRef.current?.stop();
          }, 1800); // stop 1.8s after last sound
        }
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // mic permission denied — recognition still works, just no waveform
    }
  };

  const startListening = async () => {
    if (!SR) {
      setVoiceError("Voice input requires Chrome or Edge. Please switch browsers.");
      setVoiceState("error");
      return;
    }
    setVoiceError("");
    setTranscript("");
    transcriptRef.current = "";
    finalAccRef.current = "";
    processedRef.current = false;
    hasHeardRef.current = false;
    setParsed([]);
    setVoiceState("listening");

    await startVolumeMeter();

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;   // show live text
    recognition.continuous = true;       // don't cut off early
    recognition.maxAlternatives = 5;

    recognition.onresult = (e: any) => {
      let interim = "";
      let newFinal = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) newFinal += t + " ";
        else interim += t;
      }
      if (newFinal) finalAccRef.current += newFinal;
      const display = (finalAccRef.current + interim).trim();
      transcriptRef.current = display;
      setTranscript(display);
    };

    recognition.onend = () => {
      cleanupAudio();
      if (processedRef.current) return;
      const text = (finalAccRef.current || transcriptRef.current).trim();
      if (text) {
        processTranscript(text);
      } else {
        processedRef.current = true;
        setVoiceError("We couldn't hear you clearly. Try speaking a bit louder or move closer to your device.");
        setVoiceState("error");
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === "no-speech") return; // not fatal in continuous mode
      processedRef.current = true;
      cleanupAudio();
      if (e.error === "not-allowed") {
        setVoiceError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (e.error === "network") {
        setVoiceError("Network error. Speech recognition requires an internet connection.");
      } else {
        setVoiceError("Could not capture audio. Please try again.");
      }
      setVoiceState("error");
    };

    recognition.start();
  };

  const stopListening = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
  };

  const processTranscript = (text: string) => {
    if (processedRef.current) return;
    processedRef.current = true;
    setVoiceState("processing");
    setTimeout(() => {
      const trimmed = text.trim();
      if (!trimmed) {
        setVoiceError("We couldn't hear you clearly. Try speaking a bit louder.");
        setVoiceState("error");
        return;
      }
      const result = parseVoiceInput(trimmed);
      if (result.transactions.length === 0) {
        setVoiceError(`We heard: "${trimmed}" — but couldn't find amounts or details. Try: "I sold 50k worth of shoes" or "spent 10k on transport".`);
        setVoiceState("error");
        return;
      }
      setParsed(result.transactions);
      setEditingIdx(0);
      applyParsed(result.transactions[0]);
      setVoiceState("preview");
    }, 500);
  };

  const applyParsed = (tx: ParsedTransaction) => {
    setType(tx.type);
    setAmount(String(tx.amount));
    setDescription(tx.description);
    setCategory(tx.category);
  };

  const resetVoice = () => {
    cleanupAudio();
    recognitionRef.current?.stop();
    setVoiceState("idle");
    setTranscript("");
    transcriptRef.current = "";
    finalAccRef.current = "";
    processedRef.current = false;
    hasHeardRef.current = false;
    setVoiceError("");
    setParsed([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!amount || parseFloat(amount) <= 0) { setFormError("Enter a valid amount."); return; }
    if (!description.trim()) { setFormError("Enter a description."); return; }
    if (!category) { setFormError("Select a category."); return; }
    setLoading(true);
    try {
      await addTransaction(businessId, type, parseFloat(amount), description.trim(), category);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const isActive = voiceState === "listening" || voiceState === "hearing";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border bg-card shadow-2xl p-4 md:p-6 animate-fade-up max-h-[92dvh] overflow-y-auto mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Voice section */}
        <div className="mb-5">

          {voiceState === "idle" && (
            <button type="button" onClick={startListening}
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

          {isActive && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                      <Mic size={17} className="text-white" />
                    </div>
                    <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700">
                      {voiceState === "hearing" ? "Hearing you…" : "Listening…"}
                    </p>
                    <p className="text-xs text-red-500">
                      {voiceState === "hearing" ? "Keep speaking, stops when you pause" : "Speak now — normal distance is fine"}
                    </p>
                  </div>
                </div>
                <WaveformBars active={voiceState === "hearing"} volume={volume} />
              </div>
              {transcript && (
                <div className="bg-white/60 rounded-xl px-3 py-2 border border-red-100">
                  <p className="text-xs text-red-800 italic leading-relaxed">"{transcript}"</p>
                </div>
              )}
              <button type="button" onClick={stopListening}
                className="flex items-center gap-1.5 mx-auto text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
              >
                <MicOff size={13} /> Done speaking
              </button>
            </div>
          )}

          {voiceState === "processing" && (
            <div className="rounded-2xl border bg-muted/40 p-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
              <div>
                <p className="text-sm font-semibold">Processing…</p>
                {transcript && <p className="text-xs text-muted-foreground italic mt-0.5 truncate">"{transcript}"</p>}
              </div>
            </div>
          )}

          {voiceState === "preview" && parsed.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={15} />
                  <p className="text-xs font-bold uppercase tracking-wide">Got it!</p>
                </div>
                <button type="button" onClick={resetVoice} className="text-xs text-emerald-600 hover:underline">Re-record</button>
              </div>
              <p className="text-xs text-emerald-700 italic bg-white/50 rounded-lg px-2 py-1.5">"{transcript}"</p>
              {parsed.length > 1 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-emerald-700">Multiple transactions — select one:</p>
                  {parsed.map((tx, i) => (
                    <button key={i} type="button" onClick={() => { setEditingIdx(i); applyParsed(tx); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${editingIdx === i ? "bg-emerald-200 text-emerald-900 font-semibold" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}
                    >
                      {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()} · {tx.description} · {tx.category}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Edit3 size={11} /> Form filled below — review and edit before saving
              </div>
            </div>
          )}

          {voiceState === "error" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={15} />
                <p className="text-xs font-bold">Couldn't understand</p>
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">{voiceError}</p>
              <button type="button" onClick={startListening}
                className="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                <Mic size={12} /> Try again
              </button>
            </div>
          )}
        </div>

        {/* Type toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-5">
          {(["income", "expense"] as const).map(t => (
            <button key={t} type="button" onClick={() => { setType(t); setCategory(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${type === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Amount (₦)</label>
            <input type="number" min="0" placeholder="e.g. 15000"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">{type === "income" ? "What was sold / source" : "What was it for"}</label>
            <input type="text" placeholder={type === "income" ? "e.g. Sold 10 bags" : "e.g. Bought stock"}
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${category === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground hover:border-primary/50"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          {formError && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{formError}</p>}
          <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
            {loading ? "Saving…" : `Save ${type === "income" ? "Income" : "Expense"}`}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
