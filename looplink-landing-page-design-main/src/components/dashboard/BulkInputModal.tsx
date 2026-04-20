import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addTransaction } from "@/lib/db";
import { parseTransactions, ParsedTransaction } from "@/lib/ai";
import { X, Loader2, Trash2, AlertTriangle } from "lucide-react";

interface Props {
  businessId: string;
  onClose: () => void;
  onSaved: () => void;
}

const CATEGORIES_INCOME = ["Product Sale", "Service", "Commission", "Other"];
const CATEGORIES_EXPENSE = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];

const BulkInputModal = ({ businessId, onClose, onSaved }: Props) => {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ParsedTransaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState("");
  const [saveError, setSaveError] = useState("");

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setParsing(true);
    setParseError("");
    try {
      const parsed = await parseTransactions(rawText);
      setRows(parsed);
      setStep("preview");
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : "Couldn't parse your input. Try rephrasing or add entries one at a time.");
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (i: number, field: keyof ParsedTransaction, value: string | number | null) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const deleteRow = (i: number) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    let saved = 0;
    try {
      for (const row of rows) {
        if (!row.amount || row.amount <= 0) continue;
        await addTransaction(businessId, row.type, row.amount, row.description, row.category);
        saved++;
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setSaveError(`Saved ${saved} of ${rows.length}. ${err instanceof Error ? err.message : "Some entries failed."}`);
    } finally {
      setSaving(false);
    }
  };

  const incomeRows = rows.filter(r => r.type === "income");
  const expenseRows = rows.filter(r => r.type === "expense");
  const net = incomeRows.reduce((s, r) => s + (r.amount ?? 0), 0) - expenseRows.reduce((s, r) => s + (r.amount ?? 0), 0);

  const inputCls = "rounded-lg border bg-muted/40 px-2 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-3xl border bg-card shadow-2xl animate-fade-up max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">Bulk Entry</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === "input" ? "Type multiple transactions at once" : `${rows.length} transactions detected`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "input" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">What happened today?</label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  e.g. "Bought rice 20000, transport 5000, sold coke 15000, bread 7000"
                </p>
                <textarea
                  autoFocus
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Type or paste your transactions here..."
                  className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
                  style={{ minHeight: "120px" }}
                />
              </div>
              {parseError && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{parseError}</p>}
              <Button variant="hero" size="lg" onClick={handleParse} disabled={parsing || !rawText.trim()} className="w-full rounded-xl">
                {parsing ? <><Loader2 size={16} className="animate-spin" /> Detecting transactions...</> : "Detect Transactions"}
              </Button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/40 px-4 py-3 text-sm flex flex-wrap gap-4">
                <span className="text-emerald-600 font-medium">{incomeRows.length} income</span>
                <span className="text-red-500 font-medium">{expenseRows.length} expense</span>
                <span className={`font-bold ${net >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  Net: {net >= 0 ? "+" : ""}N{net.toLocaleString()}
                </span>
              </div>

              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className={`rounded-xl border p-3 ${
                    row.confidence === "low" ? "bg-amber-50 border-amber-200" :
                    row.type === "income" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                  }`}>
                    {row.confidence === "low" && (
                      <div className="flex items-center gap-1 text-xs text-amber-700 mb-2">
                        <AlertTriangle size={12} /> Please verify this entry
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Type</p>
                        <select value={row.type} onChange={e => updateRow(i, "type", e.target.value as "income" | "expense")}
                          className={`${inputCls} w-full`}>
                          <option value="income">Income</option>
                          <option value="expense">Expense</option>
                        </select>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Amount (N)</p>
                        <input type="number" min="0" value={row.amount ?? ""} onChange={e => updateRow(i, "amount", parseFloat(e.target.value) || null)}
                          className={`${inputCls} w-full`} />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Description</p>
                        <input value={row.description} onChange={e => updateRow(i, "description", e.target.value)}
                          className={`${inputCls} w-full`} />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1">
                          <p className="text-[10px] text-muted-foreground mb-1">Category</p>
                          <select value={row.category} onChange={e => updateRow(i, "category", e.target.value)}
                            className={`${inputCls} w-full`}>
                            {(row.type === "income" ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <button onClick={() => deleteRow(i)} className="mt-4 p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {saveError && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{saveError}</p>}

              <div className="flex gap-3">
                <Button variant="hero-outline" onClick={() => setStep("input")} className="flex-1 rounded-xl">
                  Edit Input
                </Button>
                <Button variant="hero" onClick={handleSave} disabled={saving || rows.length === 0} className="flex-1 rounded-xl">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : `Save ${rows.length} Transactions`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkInputModal;
