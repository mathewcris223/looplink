import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, Transaction } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { ArrowUpRight, ArrowDownRight, Filter, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [period, setPeriod] = useState<"today" | "week" | "month" | "year">("today");
  const [loading, setLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try { setTransactions(await getTransactions(activeBusiness.id, 200)); }
    catch {} finally { setLoading(false); }
  }, [activeBusiness]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || bizLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || !activeBusiness) return null;

  const handleDelete = async (tx: Transaction) => {
    if (!confirm(`Delete this transaction?\n"${tx.description}" — ₦${tx.amount.toLocaleString()}\n\nThis cannot be undone.`)) return;
    try {
      // If this is an inventory sale, try to restore stock
      if (tx.description.startsWith("Sold:")) {
        const { data: invSale } = await supabase
          .from("inventory_sales")
          .select("id, item_id, quantity_sold")
          .eq("business_id", activeBusiness!.id)
          .order("created_at", { ascending: false })
          .limit(20);
        if (invSale && invSale.length > 0) {
          const sale = invSale[0];
          if (sale.item_id && sale.quantity_sold) {
            const { data: item } = await supabase
              .from("inventory_items")
              .select("quantity, item_type, low_stock_threshold")
              .eq("id", sale.item_id)
              .single();
            if (item) {
              const newQty = (item.quantity ?? 0) + sale.quantity_sold;
              const newStatus = newQty <= 0 ? "out_of_stock" : newQty <= (item.low_stock_threshold ?? 5) ? "low_stock" : "in_stock";
              await supabase.from("inventory_items").update({ quantity: newQty, status: newStatus }).eq("id", sale.item_id);
              await supabase.from("inventory_sales").delete().eq("id", sale.id);
            }
          }
        }
      }
      await supabase.from("transactions").delete().eq("id", tx.id);
      setTransactions(prev => prev.filter(t => t.id !== tx.id));
    } catch { /* silent */ }
  };

  const filtered = transactions.filter(t => {
    // Period filter
    const d = t.created_at?.split("T")[0] ?? "";
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const inPeriod =
      period === "today" ? d === today :
      period === "week" ? d >= weekStart :
      period === "month" ? d >= monthStart :
      d >= yearStart;
    if (!inPeriod) return false;
    return filter === "all" || t.type === filter;
  });

  const periodRevenue = filtered.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const periodExpenses = filtered.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const periodProfit = periodRevenue - periodExpenses;

  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach(t => {
    const date = new Date(t.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(t);
  });

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-bold mb-1">History</h1>
          <p className="text-muted-foreground text-xs">{activeBusiness.name} · {filtered.length} records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted-foreground shrink-0" />
          {(["income", "expense"] as const).map(f => (
            <button key={f} onClick={() => setFilter(prev => prev === f ? "all" : f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(["today", "week", "month", "year"] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              period === p ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground hover:text-foreground"
            }`}>
            {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "This Year"}
          </button>
        ))}
      </div>

      {/* Period summary */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-card border rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Revenue</p>
          <p className="text-sm font-bold text-emerald-600">₦{periodRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Expenses</p>
          <p className="text-sm font-bold text-red-500">₦{periodExpenses.toLocaleString()}</p>
        </div>
        <div className={`border rounded-xl px-3 py-2.5 text-center ${periodProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-[10px] text-muted-foreground mb-0.5">Profit</p>
          <p className={`text-sm font-bold ${periodProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {periodProfit >= 0 ? "+" : ""}₦{periodProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-1">No transactions found</p>
          <p className="text-sm">Add income or expenses from the dashboard.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, txs]) => {
            const dayIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
            const dayExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{date}</p>
                  <div className="flex gap-3 text-xs">
                    {dayIncome > 0 && <span className="text-emerald-600 font-medium">+₦{dayIncome.toLocaleString()}</span>}
                    {dayExpense > 0 && <span className="text-red-500 font-medium">-₦{dayExpense.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="rounded-2xl border bg-card overflow-hidden">
                  {txs.map((tx, i) => (
                    <div key={tx.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors ${i > 0 ? "border-t" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                          {tx.type === "income"
                            ? <ArrowUpRight size={14} className="text-emerald-600" />
                            : <ArrowDownRight size={14} className="text-red-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.category}
                            {tx.description.startsWith("Sold:") && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Inventory</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className={`text-sm font-bold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                          {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                        </span>
                        <button onClick={() => setEditingTx(tx)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleDelete(tx)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit transaction modal */}
      {editingTx && (
        <EditTransactionModal
          tx={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={() => { setEditingTx(null); load(); }}
        />
      )}
    </AppShell>
  );
};

// ── Edit Transaction Modal ────────────────────────────────────────────────────
const EditTransactionModal = ({
  tx, onClose, onSaved
}: { tx: Transaction; onClose: () => void; onSaved: () => void }) => {
  const [amount, setAmount] = useState(String(tx.amount));
  const [description, setDescription] = useState(tx.description);
  const [category, setCategory] = useState(tx.category);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const EXPENSE_CATEGORIES = ["Stock", "Transport", "Rent", "Staff", "Marketing", "Other"];
  const INCOME_CATEGORIES = ["Product Sale", "Service", "Commission", "Other"];
  const categories = tx.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!description.trim()) { setError("Enter a description."); return; }
    setLoading(true);
    try {
      await supabase.from("transactions").update({
        amount: parseFloat(amount),
        description: description.trim(),
        category,
      }).eq("id", tx.id);
      setSuccess(true);
      setTimeout(() => onSaved(), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl border bg-card shadow-2xl p-6 animate-fade-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display font-bold text-lg">Edit Transaction</h2>
            <p className="text-xs text-muted-foreground capitalize">{tx.type}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X size={18} /></button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check size={22} className="text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">Saved successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Amount (₦)</label>
              <input type="number" min="0" step="0.01" className={`${inputCls} mt-1.5`}
                value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <input className={`${inputCls} mt-1.5`} value={description}
                onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {categories.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      category === c ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground hover:border-primary/50"
                    }`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2">{error}</p>}
            <Button type="submit" variant="hero" size="lg" disabled={loading} className="w-full rounded-xl">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default History;
