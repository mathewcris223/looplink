// ── Cash Mismatch Widget ──────────────────────────────────────────────────────
// Shows on Today screen. Lets user set opening/closing cash and see if money is missing.

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, TrendingUp, X } from "lucide-react";
import {
  getTodayCashRecord, setOpeningCash, setClosingCash,
  calculateMismatch, DailyCashRecord, CashMismatchResult,
} from "@/lib/cashMismatch";

interface Props {
  businessId: string;
  todayIncome: number;
  todayExpenses: number;
}

const STATUS_STYLES = {
  balanced:   { bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle, iconColor: "text-emerald-600", textColor: "text-emerald-800" },
  missing:    { bg: "bg-red-50 border-red-200",         icon: AlertTriangle, iconColor: "text-red-600",     textColor: "text-red-800" },
  surplus:    { bg: "bg-blue-50 border-blue-200",       icon: TrendingUp,   iconColor: "text-blue-600",    textColor: "text-blue-800" },
  incomplete: { bg: "bg-amber-50 border-amber-200",     icon: AlertTriangle, iconColor: "text-amber-600",  textColor: "text-amber-800" },
  no_record:  { bg: "bg-muted/40 border-border",        icon: AlertTriangle, iconColor: "text-muted-foreground", textColor: "text-muted-foreground" },
};

const CashMismatch = ({ businessId, todayIncome, todayExpenses }: Props) => {
  const { user } = useAuth();
  const [record, setRecord] = useState<DailyCashRecord | null>(null);
  const [result, setResult] = useState<CashMismatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showOpeningInput, setShowOpeningInput] = useState(false);
  const [showClosingInput, setShowClosingInput] = useState(false);
  const [openingInput, setOpeningInput] = useState("");
  const [closingInput, setClosingInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rec = await getTodayCashRecord(businessId, user.id);
      setRecord(rec);
      setResult(calculateMismatch(rec, todayIncome, todayExpenses));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [businessId, user, todayIncome, todayExpenses]);

  useEffect(() => { load(); }, [load]);

  const handleSetOpening = async () => {
    if (!user || !openingInput) return;
    const val = parseFloat(openingInput);
    if (isNaN(val) || val < 0) { setError("Enter a valid amount."); return; }
    setSaving(true);
    setError("");
    try {
      const rec = await setOpeningCash(businessId, user.id, val);
      setRecord(rec);
      setResult(calculateMismatch(rec, todayIncome, todayExpenses));
      setShowOpeningInput(false);
      setOpeningInput("");
      setExpanded(true);
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  const handleSetClosing = async () => {
    if (!user || !closingInput) return;
    const val = parseFloat(closingInput);
    if (isNaN(val) || val < 0) { setError("Enter a valid amount."); return; }
    setSaving(true);
    setError("");
    try {
      const rec = await setClosingCash(businessId, user.id, val, todayIncome, todayExpenses);
      setRecord(rec);
      setResult(calculateMismatch(rec, todayIncome, todayExpenses));
      setShowClosingInput(false);
      setClosingInput("");
    } catch { setError("Failed to save. Try again."); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="rounded-2xl border bg-muted/20 p-4 animate-pulse h-16" />
  );

  if (!result) return null;

  const cfg = STATUS_STYLES[result.status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-2xl border ${cfg.bg} overflow-hidden mb-5`}>
      {/* Header — always visible, tap to expand */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3.5 touch-manipulation"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={18} className={cfg.iconColor} />
          <div className="text-left">
            <p className={`text-sm font-bold ${cfg.textColor}`}>
              {result.status === "missing"
                ? `₦${result.missingAmount.toLocaleString()} is missing`
                : result.status === "balanced"
                ? "You are balanced ✓"
                : result.status === "surplus"
                ? `₦${result.surplusAmount.toLocaleString()} extra`
                : result.status === "incomplete"
                ? "Cash check in progress"
                : "Cash check"}
            </p>
            <p className={`text-xs ${cfg.textColor} opacity-70`}>
              {result.status === "no_record" ? "Tap to set opening cash" : "Tap to see details"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className={cfg.iconColor} /> : <ChevronDown size={16} className={cfg.iconColor} />}
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className={`px-4 pb-4 border-t ${cfg.bg} space-y-4`}>
          {/* Message */}
          <p className={`text-sm font-medium pt-3 ${cfg.textColor}`}>{result.message}</p>

          {/* Numbers breakdown */}
          {result.status !== "no_record" && (
            <div className="space-y-2">
              {[
                { label: "Opening cash", value: result.openingCash },
                { label: "Money in today", value: todayIncome },
                { label: "Money out today", value: todayExpenses },
                { label: "Expected cash", value: result.expectedCash, bold: true },
                ...(result.closingCash !== null ? [
                  { label: "Actual cash", value: result.closingCash, bold: true },
                  {
                    label: result.status === "missing" ? "Missing" : result.status === "surplus" ? "Extra" : "Difference",
                    value: Math.abs(result.difference ?? 0),
                    bold: true,
                    color: result.status === "missing" ? "text-red-700" : result.status === "surplus" ? "text-blue-700" : "text-emerald-700",
                  },
                ] : []),
              ].map(({ label, value, bold, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className={`${cfg.textColor} opacity-70`}>{label}</span>
                  <span className={`font-${bold ? "bold" : "medium"} ${color ?? cfg.textColor}`}>
                    ₦{value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Opening cash input */}
          {(result.status === "no_record" || showOpeningInput) && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                How much cash did you start with today?
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 5000"
                  value={openingInput}
                  onChange={e => setOpeningInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetOpening()}
                  className="flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleSetOpening}
                  disabled={saving || !openingInput}
                  className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Set"}
                </button>
                {showOpeningInput && (
                  <button onClick={() => setShowOpeningInput(false)} className="p-2.5 rounded-xl bg-white/60">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Closing cash input */}
          {(result.canClose || showClosingInput) && !showOpeningInput && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                How much cash do you have now?
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 12000"
                  value={closingInput}
                  onChange={e => setClosingInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSetClosing()}
                  className="flex-1 rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-primary"
                  autoFocus
                />
                <button
                  onClick={handleSetClosing}
                  disabled={saving || !closingInput}
                  className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : "Check"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Expected: ₦{result.expectedCash.toLocaleString()}
              </p>
            </div>
          )}

          {/* Edit buttons */}
          {result.status !== "no_record" && !showOpeningInput && !result.canClose && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowOpeningInput(true); setOpeningInput(String(result.openingCash)); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Edit opening cash
              </button>
              {result.closingCash !== null && (
                <span className="text-muted-foreground">·</span>
              )}
              {result.closingCash !== null && (
                <button
                  onClick={() => { setShowClosingInput(true); setClosingInput(String(result.closingCash)); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Edit closing cash
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default CashMismatch;
