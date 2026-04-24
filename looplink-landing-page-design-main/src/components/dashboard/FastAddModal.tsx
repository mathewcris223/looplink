/**
 * FastAddModal — 1-tap transaction entry
 *
 * Flow:
 * 1. User sees: Revenue / Expense toggle + quick amount buttons + number pad
 * 2. Tap a quick amount → saved immediately (under 2 seconds)
 * 3. "Add details" expands description field (optional, never required)
 * 4. "Repeat last" button repeats the previous transaction in 1 tap
 *
 * Speed principles:
 * - Amount is pre-selected from quick buttons (no typing needed)
 * - Type defaults to "income" (most common action)
 * - Description is optional — auto-categorized as "Quick entry" if skipped
 * - Quick amounts are dynamic: last 4 unique amounts used, fallback to defaults
 */

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, ChevronUp, Loader2, RotateCcw } from "lucide-react";
import { addTransaction, getTransactions } from "@/lib/db";
import { suggestCategory, learnFromTransaction } from "@/lib/smartInsights";

interface Props {
  businessId: string;
  defaultType?: "income" | "expense";
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_AMOUNTS = [500, 1000, 2000, 5000];
const QUICK_AMOUNTS_KEY = "aje_quick_amounts";
const LAST_TX_KEY = "aje_last_tx";

interface LastTx {
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
}

function getQuickAmounts(): number[] {
  try {
    const raw = localStorage.getItem(QUICK_AMOUNTS_KEY);
    if (!raw) return DEFAULT_AMOUNTS;
    const arr = JSON.parse(raw) as number[];
    return arr.length >= 4 ? arr.slice(0, 4) : [...arr, ...DEFAULT_AMOUNTS].slice(0, 4);
  } catch { return DEFAULT_AMOUNTS; }
}

function saveQuickAmount(amount: number) {
  try {
    const current = getQuickAmounts();
    const updated = [amount, ...current.filter(a => a !== amount)].slice(0, 4);
    localStorage.setItem(QUICK_AMOUNTS_KEY, JSON.stringify(updated));
  } catch { /* */ }
}

function getLastTx(): LastTx | null {
  try {
    const raw = localStorage.getItem(LAST_TX_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLastTx(tx: LastTx) {
  try { localStorage.setItem(LAST_TX_KEY, JSON.stringify(tx)); } catch { /* */ }
}

const FastAddModal = ({ businessId, defaultType = "income", onClose, onSaved }: Props) => {
  const [type, setType] = useState<"income" | "expense">(defaultType);

  // Sync type when defaultType changes (e.g. Revenue vs Expense button)
  useEffect(() => {
    setType(defaultType);
  }, [defaultType]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [quickAmounts] = useState(getQuickAmounts);
  const [lastTx] = useState(getLastTx);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus amount input
  useEffect(() => {
    if (showDetails) return;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [showDetails]);

  const save = async (
    txType: "income" | "expense",
    txAmount: number,
    txDesc: string
  ) => {
    if (txAmount <= 0) return;
    setSaving(true);
    setError("");
    try {
      const desc = txDesc.trim() || (txType === "income" ? "Quick sale" : "Quick expense");
      const category = desc ? suggestCategory(desc, txType) : (txType === "income" ? "Product Sale" : "Other");
      await addTransaction(businessId, txType, txAmount, desc, category);
      learnFromTransaction(txType, desc, category);
      saveQuickAmount(txAmount);
      saveLastTx({ type: txType, amount: txAmount, description: desc, category });
      setSaved(true);
      setTimeout(() => { onSaved(); onClose(); }, 600);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  };

  const handleQuickAmount = (amt: number) => {
    setAmount(String(amt));
    // Auto-save immediately on quick tap if no details shown
    if (!showDetails) {
      save(type, amt, description);
    }
  };

  const handleRepeatLast = () => {
    if (!lastTx) return;
    save(lastTx.type, lastTx.amount, lastTx.description);
  };

  const handleManualSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError("Enter an amount."); return; }
    save(type, amt, description);
  };

  const isIncome = type === "income";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl shadow-2xl animate-fade-up">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-4">
          <h2 className="text-base font-bold">Add Money</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4">

          {/* ── Type toggle ── */}
          <div className="flex rounded-2xl border overflow-hidden p-1 bg-muted/30 gap-1">
            <button
              onClick={() => setType("income")}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${isIncome ? "bg-emerald-500 text-white shadow-sm" : "text-muted-foreground"}`}
            >
              💰 Revenue (Money In)
            </button>
            <button
              onClick={() => setType("expense")}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!isIncome ? "bg-red-500 text-white shadow-sm" : "text-muted-foreground"}`}
            >
              💸 Expense (Money Out)
            </button>
          </div>

          {/* ── Quick amount buttons ── */}
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Quick amounts</p>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleQuickAmount(amt)}
                  disabled={saving}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
                    amount === String(amt)
                      ? isIncome ? "bg-emerald-500 text-white border-emerald-500" : "bg-red-500 text-white border-red-500"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  ₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          {/* ── Amount input ── */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">₦</span>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !showDetails && handleManualSave()}
              className="w-full rounded-2xl border bg-muted/30 pl-9 pr-4 py-4 text-2xl font-bold outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-center"
            />
          </div>

          {/* ── Repeat last ── */}
          {lastTx && (
            <button
              onClick={handleRepeatLast}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm font-medium text-muted-foreground hover:bg-muted/40 active:scale-[0.98] transition-all"
            >
              <RotateCcw size={15} />
              Repeat: {lastTx.type === "income" ? "+" : "-"}₦{lastTx.amount.toLocaleString()} · {lastTx.description}
            </button>
          )}

          {/* ── Optional details ── */}
          <button
            onClick={() => setShowDetails(d => !d)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetails ? "Hide details" : "Add description (optional)"}
          </button>

          {showDetails && (
            <div>
              <input
                type="text"
                placeholder="What was this for? (e.g. Sold rice, Transport)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualSave()}
                autoFocus
                className="w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {description.trim().length > 2 && (
                <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                  Category: <span className="font-semibold text-primary">{suggestCategory(description, type)}</span>
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}

          {/* ── Save button ── */}
          <button
            onClick={handleManualSave}
            disabled={saving || !amount || parseFloat(amount) <= 0}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40 ${
              saved
                ? "bg-emerald-500 text-white"
                : isIncome
                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                : "bg-red-500 text-white shadow-lg shadow-red-500/25"
            }`}
          >
            {saved ? "✓ Saved!" : saving
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Saving…</span>
              : `Save ${isIncome ? "Revenue" : "Expense"}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FastAddModal;
