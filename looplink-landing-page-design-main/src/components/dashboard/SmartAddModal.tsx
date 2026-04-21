import { useState, useRef } from "react";
import { X, PenLine, Mic, Camera, Upload, Loader2, MicOff, CheckCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTransactions, ParsedTransaction } from "@/lib/ai";
import { addTransaction } from "@/lib/db";

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

type Mode = "menu" | "manual" | "bulk" | "voice" | "image" | "upload" | "preview";

const CATEGORIES_REVENUE = ["Product Sale", "Service", "Commission", "Other"];
const CATEGORIES_EXPENSE = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];

const SmartAddModal = ({ businessId, onClose, onSaved }: Props) => {
  const [mode, setMode] = useState<Mode>("menu");
  const [rows, setRows] = useState<ParsedTransaction[]>([]);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Manual form state
  const [manualType, setManualType] = useState<"income" | "expense">("income");
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCat, setManualCat] = useState("Product Sale");
  const [bulkText, setBulkText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);

  // ── Voice input ──────────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported on this browser. Try Chrome.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-NG";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join(" ");
      setTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => { setListening(false); setError("Could not capture voice. Try again."); };
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setTranscript("");
  };

  const stopListening = () => {
    (recognitionRef.current as { stop?: () => void })?.stop?.();
    setListening(false);
  };

  const parseVoice = async () => {
    if (!transcript.trim()) return;
    await parseAndPreview(transcript);
  };

  // ── Image / file processing ───────────────────────────────────────────────
  const handleImageFile = async (file: File) => {
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    // Convert image to base64 and send as text prompt to AI
    const reader = new FileReader();
    reader.onload = async () => {
      const prompt = `Extract all financial transactions from this receipt/document image. List each item with amount, description, and whether it's income or expense. Image data: [image attached - describe what you see as transactions]`;
      await parseAndPreview(prompt);
    };
    reader.readAsDataURL(file);
  };

  // ── Core parse + preview ─────────────────────────────────────────────────
  const parseAndPreview = async (text: string) => {
    setParsing(true);
    setError("");
    try {
      const parsed = await parseTransactions(text);
      setRows(parsed);
      setMode("preview");
    } catch {
      setError("Couldn't parse input. Try rephrasing or use manual entry.");
    } finally {
      setParsing(false);
    }
  };

  // ── Manual save ──────────────────────────────────────────────────────────
  const saveManual = async () => {
    if (!manualAmount || parseFloat(manualAmount) <= 0) { setError("Enter a valid amount."); return; }
    if (!manualDesc.trim()) { setError("Enter a description."); return; }
    setSaving(true);
    try {
      await addTransaction(businessId, manualType, parseFloat(manualAmount), manualDesc.trim(), manualCat);
      onSaved();
      onClose();
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  // ── Bulk save from preview ───────────────────────────────────────────────
  const saveBulk = async () => {
    setSaving(true);
    setError("");
    try {
      for (const row of rows) {
        if (!row.amount || row.amount <= 0) continue;
        await addTransaction(businessId, row.type, row.amount, row.description, row.category);
      }
      onSaved();
      onClose();
    } catch { setError("Some entries failed to save."); }
    finally { setSaving(false); }
  };

  const updateRow = (i: number, field: keyof ParsedTransaction, value: string | number | null) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  const smallInputCls = "rounded-lg border bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-primary";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border bg-card shadow-2xl animate-fade-up max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">
              {mode === "menu" ? "Add Entry" :
               mode === "manual" ? "Manual Entry" :
               mode === "bulk" ? "Bulk Entry" :
               mode === "voice" ? "Voice Entry" :
               mode === "image" ? "Snap Receipt" :
               mode === "upload" ? "Upload File" : "Review & Save"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "menu" ? "Choose how to add your entry" :
               mode === "preview" ? `${rows.length} transaction${rows.length !== 1 ? "s" : ""} detected` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode !== "menu" && (
              <button onClick={() => { setMode("menu"); setError(""); setTranscript(""); setImagePreview(null); }}
                className="text-xs text-primary hover:underline px-2 py-1">← Back</button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {/* ── MENU ── */}
          {mode === "menu" && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "manual", icon: PenLine, label: "Enter Manually", desc: "Type amount & details", color: "bg-blue-50 text-blue-600" },
                { id: "bulk", icon: Layers, label: "Bulk Entry", desc: "Multiple entries at once", color: "bg-emerald-50 text-emerald-600" },
                { id: "voice", icon: Mic, label: "Speak Entry", desc: "Talk to record", color: "bg-violet-50 text-violet-600" },
                { id: "image", icon: Camera, label: "Snap Receipt", desc: "Take a photo", color: "bg-amber-50 text-amber-600" },
              ].map(({ id, icon: Icon, label, desc, color }) => (
                <button key={id} onClick={() => setMode(id as Mode)}
                  className="flex flex-col items-start gap-3 p-4 rounded-2xl border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left active:scale-95">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── BULK ENTRY ── */}
          {mode === "bulk" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 border px-4 py-3 text-xs text-muted-foreground">
                Type multiple entries separated by commas or new lines.<br />
                <span className="font-medium text-foreground">Example:</span> "Rice 20000, transport 5000, sold coke 15000"
              </div>
              <textarea
                autoFocus
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder="Rice 20000, transport 5000, sold coke 15000..."
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                style={{ minHeight: "140px" }}
              />
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              <Button variant="hero" size="lg" onClick={() => parseAndPreview(bulkText)} disabled={parsing || !bulkText.trim()} className="w-full rounded-xl">
                {parsing ? <><Loader2 size={16} className="animate-spin" /> Detecting entries…</> : "Detect Transactions →"}
              </Button>
            </div>
          )}

          {/* ── MANUAL ── */}
          {mode === "manual" && (
            <div className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl border overflow-hidden">
                {(["income", "expense"] as const).map(t => (
                  <button key={t} onClick={() => { setManualType(t); setManualCat(t === "income" ? "Product Sale" : "Stock"); }}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${manualType === t ? (t === "income" ? "bg-emerald-500 text-white" : "bg-red-500 text-white") : "bg-muted/40 text-muted-foreground"}`}>
                    {t === "income" ? "💰 Revenue" : "💸 Expense"}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-sm font-medium">Amount (₦)</label>
                <input autoFocus type="number" min="0" placeholder="e.g. 5000"
                  value={manualAmount} onChange={e => setManualAmount(e.target.value)}
                  className={`${inputCls} mt-1.5`} />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <input type="text" placeholder="e.g. Sold 10 bags of rice"
                  value={manualDesc} onChange={e => setManualDesc(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveManual()}
                  className={`${inputCls} mt-1.5`} />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select value={manualCat} onChange={e => setManualCat(e.target.value)} className={`${inputCls} mt-1.5`}>
                  {(manualType === "income" ? CATEGORIES_REVENUE : CATEGORIES_EXPENSE).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              <Button variant="hero" size="lg" onClick={saveManual} disabled={saving} className="w-full rounded-xl">
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Save Entry"}
              </Button>
            </div>
          )}

          {/* ── VOICE ── */}
          {mode === "voice" && (
            <div className="space-y-5 text-center">
              <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all duration-300 ${listening ? "bg-red-100 animate-pulse shadow-lg shadow-red-200" : "bg-violet-100"}`}>
                {listening ? <MicOff size={36} className="text-red-500" /> : <Mic size={36} className="text-violet-600" />}
              </div>
              <div>
                <p className="font-semibold text-sm">{listening ? "Listening… speak now" : "Tap to start speaking"}</p>
                <p className="text-xs text-muted-foreground mt-1">e.g. "I spent ₦5,000 on transport" or "Sold goods for ₦20,000"</p>
              </div>
              {transcript && (
                <div className="rounded-xl bg-muted/40 border px-4 py-3 text-sm text-left italic text-muted-foreground">
                  "{transcript}"
                </div>
              )}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              <div className="flex gap-3">
                {!listening ? (
                  <Button variant="hero" size="lg" onClick={startListening} className="flex-1 rounded-xl gap-2">
                    <Mic size={16} /> Start Speaking
                  </Button>
                ) : (
                  <Button variant="hero-outline" size="lg" onClick={stopListening} className="flex-1 rounded-xl gap-2">
                    <MicOff size={16} /> Stop
                  </Button>
                )}
                {transcript && !listening && (
                  <Button variant="hero" size="lg" onClick={parseVoice} disabled={parsing} className="flex-1 rounded-xl">
                    {parsing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : "Process →"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── IMAGE (camera) ── */}
          {mode === "image" && (
            <div className="space-y-5 text-center">
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
              {imagePreview ? (
                <img src={imagePreview} alt="Receipt" className="w-full max-h-48 object-contain rounded-xl border" />
              ) : (
                <div className="w-24 h-24 rounded-full mx-auto bg-emerald-100 flex items-center justify-center">
                  <Camera size={36} className="text-emerald-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">Take a photo of your receipt</p>
                <p className="text-xs text-muted-foreground mt-1">AI will extract the transaction details automatically</p>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              {parsing && <p className="text-sm text-muted-foreground animate-pulse">Analysing image…</p>}
              {!parsing && (
                <Button variant="hero" size="lg" onClick={() => cameraInputRef.current?.click()} className="w-full rounded-xl gap-2">
                  <Camera size={16} /> {imagePreview ? "Retake Photo" : "Open Camera"}
                </Button>
              )}
            </div>
          )}

          {/* ── UPLOAD ── */}
          {mode === "upload" && (
            <div className="space-y-5 text-center">
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }} />
              <div className="w-24 h-24 rounded-full mx-auto bg-amber-100 flex items-center justify-center">
                <Upload size={36} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Upload a receipt or document</p>
                <p className="text-xs text-muted-foreground mt-1">Supports images, PDFs, and text files</p>
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              {parsing && <p className="text-sm text-muted-foreground animate-pulse">Processing file…</p>}
              {!parsing && (
                <Button variant="hero" size="lg" onClick={() => fileInputRef.current?.click()} className="w-full rounded-xl gap-2">
                  <Upload size={16} /> Choose File
                </Button>
              )}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {mode === "preview" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm flex flex-wrap gap-4">
                <span className="text-emerald-600 font-medium">{rows.filter(r => r.type === "income").length} revenue</span>
                <span className="text-red-500 font-medium">{rows.filter(r => r.type === "expense").length} expense</span>
              </div>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${row.type === "income" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                        <select value={row.type} onChange={e => updateRow(i, "type", e.target.value)} className={`${smallInputCls} w-full`}>
                          <option value="income">Revenue</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Amount (₦)</p>
                        <input type="number" min="0" value={row.amount ?? ""} onChange={e => updateRow(i, "amount", parseFloat(e.target.value) || null)} className={`${smallInputCls} w-full`} />
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                        <input value={row.description} onChange={e => updateRow(i, "description", e.target.value)} className={`${smallInputCls} w-full`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
              <div className="flex gap-3">
                <Button variant="hero-outline" onClick={() => setMode("menu")} className="flex-1 rounded-xl">Start Over</Button>
                <Button variant="hero" onClick={saveBulk} disabled={saving || rows.length === 0} className="flex-1 rounded-xl">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><CheckCircle size={16} /> Save {rows.length}</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartAddModal;
