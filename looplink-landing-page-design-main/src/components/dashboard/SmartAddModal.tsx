/**
 * SmartAddModal — Unified input system
 * Menu: Revenue | Expense | Sell Stock | Bulk Entry
 * Inside Revenue/Expense: Type | Voice | Snap tabs
 */

import { useState, useRef, useCallback } from "react";
import { X, Mic, MicOff, Camera, Loader2, CheckCircle, ArrowUpRight, ArrowDownRight, ShoppingCart, Layers, FileUp } from "lucide-react";
import { addTransaction } from "@/lib/db";
import { suggestCategory, learnFromTransaction } from "@/lib/smartInsights";
import { useInventory } from "@/context/InventoryContext";
import { useNavigate } from "react-router-dom";
import BulkInputModal from "@/components/dashboard/BulkInputModal";
import QuickSellModal from "@/components/dashboard/QuickSellModal";

interface Props {
  businessId: string;
  defaultScreen?: Screen;
  onClose: () => void;
  onSaved: () => void;
}

type Screen = "menu" | "revenue" | "expense" | "sell" | "bulk" | "upload";
type InputTab = "type" | "voice" | "snap";

const EXPENSE_CATS = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Food", "Utilities", "Other"];
const INCOME_CATS = ["Product Sale", "Service", "Commission", "Other"];

const inputCls = "w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

// ── Shared Revenue/Expense entry panel ───────────────────────────────────────
const EntryPanel = ({
  type, businessId, onClose, onSaved
}: { type: "income" | "expense"; businessId: string; onClose: () => void; onSaved: () => void }) => {
  const [tab, setTab] = useState<InputTab>("type");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState(type === "income" ? "Product Sale" : "Stock");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Voice
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  // Snap
  const snapRef = useRef<HTMLInputElement>(null);
  const [snapProcessing, setSnapProcessing] = useState(false);
  const [snapPreview, setSnapPreview] = useState<string | null>(null);

  const isIncome = type === "income";
  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;
  const suggestedCat = desc.trim().length > 2 ? suggestCategory(desc, type) : cat;

  const save = async (a: number, d: string, c: string) => {
    if (a <= 0) { setError("Enter a valid amount."); return; }
    setSaving(true); setError("");
    try {
      const finalCat = c || suggestCategory(d, type);
      await addTransaction(businessId, type, a, d || (isIncome ? "Quick sale" : "Quick expense"), finalCat);
      learnFromTransaction(type, d, finalCat);
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 600);
    } catch { setError("Failed to save. Try again."); setSaving(false); }
  };

  const handleTypeSave = () => save(parseFloat(amount), desc.trim(), suggestedCat);

  // Voice
  const startListening = () => {
    const SR = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) { setError("Voice not supported. Try Chrome."); return; }
    const rec = new SR();
    rec.lang = "en-NG"; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e: SpeechRecognitionEvent) => setTranscript(Array.from(e.results).map(r => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setError("Could not capture voice. Try again."); };
    recognitionRef.current = rec;
    rec.start(); setListening(true); setTranscript("");
  };

  const stopListening = () => { (recognitionRef.current as { stop?: () => void })?.stop?.(); setListening(false); };

  const processVoice = useCallback(async () => {
    if (!transcript.trim()) return;
    setProcessing(true); setError("");
    try {
      // Extract amount from transcript
      const amtMatch = transcript.match(/[\d,]+(?:\.\d+)?/);
      const amt = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, "")) : 0;
      const cleanDesc = transcript.replace(/[\d,]+(?:\.\d+)?/g, "").replace(/naira|₦|spent|sold|paid|for|on|i|the/gi, "").trim();
      const detectedCat = suggestCategory(transcript, type);
      setAmount(String(amt)); setDesc(cleanDesc); setCat(detectedCat);
      setTab("type"); // switch to type tab to confirm
    } catch { setError("Could not process voice. Try again."); }
    finally { setProcessing(false); }
  }, [transcript, type]);

  // Snap
  const handleSnap = async (file: File) => {
    setSnapProcessing(true); setError("");
    const url = URL.createObjectURL(file);
    setSnapPreview(url);
    try {
      const { aiRequest } = await import("@/lib/aiClient");
      const reply = await aiRequest({
        message: `Extract the total amount and description from this receipt. Reply with just: AMOUNT: [number] DESCRIPTION: [text]`,
        businessType: "general",
      });
      const amtMatch = reply.match(/AMOUNT:\s*([\d.]+)/i);
      const descMatch = reply.match(/DESCRIPTION:\s*(.+)/i);
      if (amtMatch) setAmount(amtMatch[1]);
      if (descMatch) setDesc(descMatch[1].trim());
      setTab("type");
    } catch { setError("Could not read image. Enter manually."); setTab("type"); }
    finally { setSnapProcessing(false); }
  };

  const accentColor = isIncome ? "emerald" : "red";

  return (
    <div className="space-y-4">
      {/* Input mode tabs */}
      <div className="flex rounded-xl border overflow-hidden p-0.5 bg-muted/30 gap-0.5">
        {(["type", "voice", "snap"] as InputTab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? `bg-${accentColor}-500 text-white` : "text-muted-foreground"}`}>
            {t === "type" ? "⌨️ Type" : t === "voice" ? "🎤 Voice" : "📷 Snap"}
          </button>
        ))}
      </div>

      {/* ── TYPE ── */}
      {tab === "type" && (
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₦</span>
            <input autoFocus type="number" inputMode="numeric" placeholder="0"
              value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleTypeSave()}
              className="w-full rounded-xl border bg-muted/30 pl-9 pr-4 py-4 text-2xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center" />
          </div>
          <input type="text" placeholder="Description (optional)"
            value={desc} onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleTypeSave()}
            className={inputCls} />
          {desc.trim().length > 2 && (
            <p className="text-[11px] text-muted-foreground px-1">
              Category: <span className="font-semibold text-primary">{suggestedCat}</span>
            </p>
          )}
        </div>
      )}

      {/* ── VOICE ── */}
      {tab === "voice" && (
        <div className="space-y-4 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${listening ? "bg-red-100 animate-pulse" : "bg-violet-100"}`}>
            {listening ? <MicOff size={32} className="text-red-500" /> : <Mic size={32} className="text-violet-600" />}
          </div>
          <p className="text-sm font-medium">{listening ? "Listening… speak now" : "Tap to speak"}</p>
          <p className="text-xs text-muted-foreground">
            {isIncome ? '"Sold goods for 20000"' : '"Spent 5000 on transport"'}
          </p>
          {transcript && (
            <div className="rounded-xl bg-muted/40 border px-4 py-3 text-sm italic text-muted-foreground text-left">
              "{transcript}"
            </div>
          )}
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            {!listening
              ? <button onClick={startListening} className="flex-1 py-3 rounded-xl bg-violet-500 text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"><Mic size={16} /> Start</button>
              : <button onClick={stopListening} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"><MicOff size={16} /> Stop</button>
            }
            {transcript && !listening && (
              <button onClick={processVoice} disabled={processing}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                {processing ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : "Use →"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── SNAP ── */}
      {tab === "snap" && (
        <div className="space-y-4 text-center">
          <input ref={snapRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleSnap(f); }} />
          {snapPreview
            ? <img src={snapPreview} alt="Receipt" className="w-full max-h-40 object-contain rounded-xl border" />
            : <div className="w-20 h-20 rounded-full mx-auto bg-amber-100 flex items-center justify-center"><Camera size={32} className="text-amber-600" /></div>
          }
          <p className="text-sm font-medium">{snapProcessing ? "Reading image…" : "Take a photo of your receipt"}</p>
          <p className="text-xs text-muted-foreground">AI extracts amount and description automatically</p>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
          {snapProcessing
            ? <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Reading image…</div>
            : <button onClick={() => snapRef.current?.click()}
                className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-95 transition-transform flex items-center justify-center gap-2">
                <Camera size={16} /> {snapPreview ? "Retake" : "Open Camera"}
              </button>
          }
        </div>
      )}

      {error && tab === "type" && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {/* Save button — only show on type tab */}
      {tab === "type" && (
        <button onClick={handleTypeSave} disabled={saving || saved || !amount || parseFloat(amount) <= 0}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
            saved ? "bg-emerald-500 text-white" : isIncome ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          }`}>
          {saved
            ? <span className="flex items-center justify-center gap-2"><CheckCircle size={18} /> Saved!</span>
            : saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving…</span>
            : `Save ${isIncome ? "Revenue" : "Expense"}`}
        </button>
      )}
    </div>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const SmartAddModal = ({ businessId, defaultScreen, onClose, onSaved }: Props) => {
  const [screen, setScreen] = useState<Screen>(defaultScreen ?? "menu");
  const { inventoryItems } = useInventory();
  const navigate = useNavigate();

  const MENU = [
    { id: "revenue" as Screen, icon: ArrowUpRight, label: "Revenue", desc: "Money coming in", color: "bg-emerald-500", textColor: "text-white" },
    { id: "expense" as Screen, icon: ArrowDownRight, label: "Expense", desc: "Money going out", color: "bg-red-500", textColor: "text-white" },
    { id: "sell" as Screen, icon: ShoppingCart, label: "Sell Stock", desc: "Quick POS sale", color: "bg-amber-500", textColor: "text-white" },
    { id: "bulk" as Screen, icon: Layers, label: "Bulk Entry", desc: "Multiple at once", color: "bg-violet-500", textColor: "text-white" },
    { id: "upload" as Screen, icon: FileUp, label: "Upload File", desc: "Import bank statement or CSV", color: "bg-blue-500", textColor: "text-white" },
  ];

  const title = screen === "menu" ? "Add Entry"
    : screen === "revenue" ? "Revenue"
    : screen === "expense" ? "Expense"
    : screen === "sell" ? "Sell Stock"
    : "Bulk Entry";

  // Upload navigates to the dedicated page
  if (screen === "upload") {
    onClose();
    navigate("/upload");
    return null;
  }

  // Sell and Bulk render as full-screen overlays — just render them directly
  if (screen === "sell") {
    return (
      <QuickSellModal
        businessId={businessId}
        items={inventoryItems}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  if (screen === "bulk") {
    return (
      <BulkInputModal
        businessId={businessId}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl flex flex-col"
        style={{ maxHeight: "92dvh" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            {screen !== "menu" && (
              <button onClick={() => setScreen("menu")}
                className="text-xs text-primary font-medium hover:underline">← Back</button>
            )}
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {/* ── MENU ── */}
          {screen === "menu" && (
            <div className="grid grid-cols-2 gap-3">
              {MENU.map(({ id, icon: Icon, label, desc, color, textColor }) => (
                <button key={id} onClick={() => setScreen(id)}
                  className={`flex flex-col items-start gap-3 p-4 rounded-2xl ${color} ${textColor} active:scale-95 transition-transform shadow-sm`}>
                  <Icon size={24} />
                  <div>
                    <p className="text-sm font-bold">{label}</p>
                    <p className="text-xs opacity-80">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── REVENUE ── */}
          {screen === "revenue" && (
            <EntryPanel type="income" businessId={businessId} onClose={onClose} onSaved={onSaved} />
          )}

          {/* ── EXPENSE ── */}
          {screen === "expense" && (
            <EntryPanel type="expense" businessId={businessId} onClose={onClose} onSaved={onSaved} />
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAddModal;
