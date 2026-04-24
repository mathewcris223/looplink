/**
 * BulkInputModal — Structured multi-row entry
 * Input modes: Type | Voice | Snap
 * Sales: item, qty, price
 * Expenses: amount, description, category
 */

import { useState, useRef, useCallback } from "react";
import { X, Plus, Trash2, Loader2, CheckCircle, Mic, MicOff, Camera } from "lucide-react";
import { addTransaction } from "@/lib/db";
import { suggestCategory } from "@/lib/smartInsights";

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

type InputMode = "type" | "voice" | "snap";
type Tab = "sales" | "expenses";

interface SaleRow { id: number; item: string; qty: string; price: string; }
interface ExpenseRow { id: number; amount: string; description: string; category: string; }

const EXPENSE_CATS = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Food", "Utilities", "Other"];

let _id = 1;
const uid = () => _id++;
const newSale = (): SaleRow => ({ id: uid(), item: "", qty: "1", price: "" });
const newExpense = (): ExpenseRow => ({ id: uid(), amount: "", description: "", category: "Stock" });

const inputCls = "w-full rounded-lg border bg-muted/30 px-2.5 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50";

// ── Parse voice/text into rows ────────────────────────────────────────────────
function parseVoiceToRows(text: string): { sales: SaleRow[]; expenses: ExpenseRow[] } {
  const sales: SaleRow[] = [];
  const expenses: ExpenseRow[] = [];

  // Split by "and", comma, or newline
  const parts = text.split(/\band\b|,|\n/i).map(p => p.trim()).filter(Boolean);

  for (const part of parts) {
    const amtMatch = part.match(/[\d,]+(?:\.\d+)?/);
    const amt = amtMatch ? parseFloat(amtMatch[0].replace(/,/g, "")) : 0;
    if (!amt) continue;

    const isExpense = /spent|paid|bought|expense|cost|transport|fuel|food|rent|staff|market/i.test(part);
    const isSale = /sold|sale|revenue|received|earned|income/i.test(part);
    const desc = part.replace(/[\d,]+(?:\.\d+)?/g, "").replace(/naira|₦|spent|sold|paid|for|on|i|the|and/gi, "").trim();

    if (isExpense && !isSale) {
      expenses.push({ id: uid(), amount: String(amt), description: desc || "Expense", category: suggestCategory(part, "expense") });
    } else {
      sales.push({ id: uid(), item: desc || "Sale", qty: "1", price: String(amt) });
    }
  }

  return { sales, expenses };
}

const BulkInputModal = ({ businessId, onClose, onSaved }: Props) => {
  const [inputMode, setInputMode] = useState<InputMode>("type");
  const [tab, setTab] = useState<Tab>("sales");
  const [sales, setSales] = useState<SaleRow[]>([newSale(), newSale()]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([newExpense(), newExpense()]);
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

  const lastSaleRef = useRef<HTMLInputElement>(null);
  const lastExpRef = useRef<HTMLInputElement>(null);

  // Totals
  const salesTotal = sales.reduce((s, r) => s + (parseFloat(r.price) || 0) * (parseFloat(r.qty) || 1), 0);
  const expTotal = expenses.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const addSaleRow = () => { setSales(prev => [...prev, newSale()]); setTimeout(() => lastSaleRef.current?.focus(), 50); };
  const addExpRow = () => { setExpenses(prev => [...prev, newExpense()]); setTimeout(() => lastExpRef.current?.focus(), 50); };
  const updateSale = (id: number, field: keyof SaleRow, val: string) => setSales(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const updateExp = (id: number, field: keyof ExpenseRow, val: string) => setExpenses(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  const deleteSale = (id: number) => setSales(prev => prev.filter(r => r.id !== id));
  const deleteExp = (id: number) => setExpenses(prev => prev.filter(r => r.id !== id));

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

  const processVoice = useCallback(() => {
    if (!transcript.trim()) return;
    setProcessing(true);
    try {
      const { sales: s, expenses: e } = parseVoiceToRows(transcript);
      if (s.length > 0) { setSales(s); setTab("sales"); }
      if (e.length > 0) { setExpenses(e); if (s.length === 0) setTab("expenses"); }
      setInputMode("type");
      setTranscript("");
    } catch { setError("Could not process voice. Try again."); }
    finally { setProcessing(false); }
  }, [transcript]);

  // Snap
  const handleSnap = async (file: File) => {
    setSnapProcessing(true); setError("");
    try {
      const { aiRequest } = await import("@/lib/aiClient");
      const reader = new FileReader();
      reader.readAsDataURL(file);
      await new Promise(res => { reader.onload = res; });
      const reply = await aiRequest({
        message: `Extract all transactions from this receipt/list. For each item return: TYPE (sale/expense), AMOUNT (number), DESCRIPTION (text). Format as lines like: "sale|5000|Rice" or "expense|2000|Transport". Only return the data lines.`,
        businessType: "general",
      });
      const lines = reply.split("\n").filter(l => l.includes("|"));
      const newSales: SaleRow[] = [];
      const newExpenses: ExpenseRow[] = [];
      for (const line of lines) {
        const [type, amt, desc] = line.split("|").map(s => s.trim());
        const amount = parseFloat(amt);
        if (!amount) continue;
        if (type?.toLowerCase().includes("sale")) {
          newSales.push({ id: uid(), item: desc || "Sale", qty: "1", price: String(amount) });
        } else {
          newExpenses.push({ id: uid(), amount: String(amount), description: desc || "Expense", category: suggestCategory(desc || "", "expense") });
        }
      }
      if (newSales.length > 0) setSales(newSales);
      if (newExpenses.length > 0) { setExpenses(newExpenses); if (newSales.length === 0) setTab("expenses"); }
      setInputMode("type");
    } catch { setError("Could not read image. Enter manually."); setInputMode("type"); }
    finally { setSnapProcessing(false); }
  };

  const handleSave = async () => {
    setError("");
    const validSales = sales.filter(r => r.item.trim() && parseFloat(r.price) > 0);
    const validExp = expenses.filter(r => parseFloat(r.amount) > 0 && r.description.trim());
    if (validSales.length === 0 && validExp.length === 0) { setError("Add at least one valid entry before saving."); return; }
    setSaving(true);
    try {
      for (const r of validSales) {
        const qty = parseFloat(r.qty) || 1;
        await addTransaction(businessId, "income", parseFloat(r.price) * qty, r.item.trim(), "Product Sale");
      }
      for (const r of validExp) {
        await addTransaction(businessId, "expense", parseFloat(r.amount), r.description.trim(), r.category);
      }
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 700);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Some entries failed. Try again.");
      setSaving(false);
    }
  };

  const totalEntries = sales.filter(r => r.item.trim() && parseFloat(r.price) > 0).length
    + expenses.filter(r => parseFloat(r.amount) > 0 && r.description.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl flex flex-col" style={{ maxHeight: "94dvh" }}>

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-muted" /></div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-1 pb-2 shrink-0">
          <div>
            <h2 className="text-base font-bold">Bulk Entry</h2>
            <p className="text-xs text-muted-foreground">Add multiple entries at once</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        {/* Input mode tabs */}
        <div className="flex mx-5 mb-2 rounded-xl border overflow-hidden p-0.5 bg-muted/30 gap-0.5 shrink-0">
          {(["type", "voice", "snap"] as InputMode[]).map(m => (
            <button key={m} onClick={() => { setInputMode(m); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${inputMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {m === "type" ? "⌨️ Type" : m === "voice" ? "🎤 Voice" : "📷 Snap"}
            </button>
          ))}
        </div>

        {/* ── VOICE MODE ── */}
        {inputMode === "voice" && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6 space-y-4 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${listening ? "bg-red-100 animate-pulse" : "bg-violet-100"}`}>
              {listening ? <MicOff size={32} className="text-red-500" /> : <Mic size={32} className="text-violet-600" />}
            </div>
            <p className="text-sm font-medium">{listening ? "Listening… speak now" : "Tap to speak"}</p>
            <p className="text-xs text-muted-foreground">"I spent 5000 on fuel and 2000 on food and sold rice for 20000"</p>
            {transcript && (
              <div className="w-full rounded-xl bg-muted/40 border px-4 py-3 text-sm italic text-muted-foreground text-left">"{transcript}"</div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 w-full">{error}</p>}
            <div className="flex gap-2 w-full">
              {!listening
                ? <button onClick={startListening} className="flex-1 py-3 rounded-xl bg-violet-500 text-white text-sm font-bold active:scale-95 flex items-center justify-center gap-2"><Mic size={16} /> Start</button>
                : <button onClick={stopListening} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold active:scale-95 flex items-center justify-center gap-2"><MicOff size={16} /> Stop</button>
              }
              {transcript && !listening && (
                <button onClick={processVoice} disabled={processing}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold active:scale-95 flex items-center justify-center gap-2">
                  {processing ? <><Loader2 size={14} className="animate-spin" /> Processing…</> : "Use →"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── SNAP MODE ── */}
        {inputMode === "snap" && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-6 space-y-4 text-center">
            <input ref={snapRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleSnap(f); }} />
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
              <Camera size={32} className="text-amber-600" />
            </div>
            <p className="text-sm font-medium">Take a photo of your receipt or list</p>
            <p className="text-xs text-muted-foreground">AI extracts all transactions automatically</p>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 w-full">{error}</p>}
            {snapProcessing
              ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Processing image…</div>
              : <button onClick={() => snapRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-amber-500 text-white text-sm font-bold active:scale-95 flex items-center justify-center gap-2">
                  <Camera size={16} /> Open Camera / Upload
                </button>
            }
          </div>
        )}

        {/* ── TYPE MODE ── */}
        {inputMode === "type" && (
          <>
            {/* Sales/Expenses tabs */}
            <div className="flex mx-5 mb-2 rounded-xl border overflow-hidden p-1 bg-muted/30 gap-1 shrink-0">
              <button onClick={() => setTab("sales")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "sales" ? "bg-emerald-500 text-white" : "text-muted-foreground"}`}>
                💰 Sales
              </button>
              <button onClick={() => setTab("expenses")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === "expenses" ? "bg-red-500 text-white" : "text-muted-foreground"}`}>
                💸 Expenses
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-2">
              {tab === "sales" && (
                <>
                  <div className="grid grid-cols-[1fr_56px_80px_24px] gap-2 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Item</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Qty</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Price ₦</p>
                    <span />
                  </div>
                  {sales.map((row, i) => (
                    <div key={row.id} className="grid grid-cols-[1fr_56px_80px_24px] gap-2 items-center">
                      <input ref={i === sales.length - 1 ? lastSaleRef : undefined} value={row.item}
                        onChange={e => updateSale(row.id, "item", e.target.value)} placeholder={`Item ${i + 1}`} className={inputCls} />
                      <input type="number" inputMode="numeric" min="1" value={row.qty}
                        onChange={e => updateSale(row.id, "qty", e.target.value)} className={inputCls} />
                      <input type="number" inputMode="decimal" min="0" value={row.price}
                        onChange={e => updateSale(row.id, "price", e.target.value)} placeholder="0" className={inputCls} />
                      <button onClick={() => deleteSale(row.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addSaleRow} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-emerald-300 text-emerald-600 text-sm font-semibold hover:bg-emerald-50 transition-colors active:scale-[0.98]">
                    <Plus size={15} /> Add row
                  </button>
                  {salesTotal > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <p className="text-xs font-semibold text-emerald-700">{sales.filter(r => r.item && parseFloat(r.price) > 0).length} sales</p>
                      <p className="text-base font-bold text-emerald-700">₦{salesTotal.toLocaleString()}</p>
                    </div>
                  )}
                </>
              )}

              {tab === "expenses" && (
                <>
                  <div className="grid grid-cols-[80px_1fr_100px_24px] gap-2 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Amount ₦</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</p>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Category</p>
                    <span />
                  </div>
                  {expenses.map((row, i) => (
                    <div key={row.id} className="grid grid-cols-[80px_1fr_100px_24px] gap-2 items-center">
                      <input ref={i === expenses.length - 1 ? lastExpRef : undefined} type="number" inputMode="decimal" min="0"
                        value={row.amount} onChange={e => updateExp(row.id, "amount", e.target.value)} placeholder="0" className={inputCls} />
                      <input value={row.description} onChange={e => updateExp(row.id, "description", e.target.value)}
                        placeholder={`Expense ${i + 1}`} className={inputCls} />
                      <select value={row.category} onChange={e => updateExp(row.id, "category", e.target.value)} className={inputCls}>
                        {EXPENSE_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={() => deleteExp(row.id)} className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  <button onClick={addExpRow} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-red-300 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors active:scale-[0.98]">
                    <Plus size={15} /> Add row
                  </button>
                  {expTotal > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-xs font-semibold text-red-600">{expenses.filter(r => parseFloat(r.amount) > 0 && r.description).length} expenses</p>
                      <p className="text-base font-bold text-red-600">₦{expTotal.toLocaleString()}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-6 pt-3 shrink-0 space-y-2">
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
              <button onClick={handleSave} disabled={saving || saved}
                className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"}`}>
                {saved
                  ? <span className="flex items-center justify-center gap-2"><CheckCircle size={18} /> Saved!</span>
                  : saving
                  ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving…</span>
                  : totalEntries > 0 ? `Save ${totalEntries} entr${totalEntries === 1 ? "y" : "ies"}` : "Save All"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BulkInputModal;
