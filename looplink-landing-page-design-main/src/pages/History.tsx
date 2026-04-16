import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, Transaction } from "@/lib/db";
import { ArrowUpRight, ArrowDownRight, Filter } from "lucide-react";

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [loading, setLoading] = useState(false);

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

  const filtered = transactions.filter(t => filter === "all" || t.type === filter);

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach(t => {
    const date = new Date(t.created_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(t);
  });

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness} onAddBusiness={() => navigate("/onboarding")}>
      <div className="flex items-start justify-between mb-6 md:mb-8 gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl lg:text-3xl font-bold mb-1">Transaction History</h1>
          <p className="text-muted-foreground text-xs md:text-sm">{activeBusiness.name} · {transactions.length} records</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted-foreground shrink-0" />
          {(["all", "income", "expense"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-full text-xs font-medium capitalize transition-all min-h-[36px] ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
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
                    <div
                      key={tx.id}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors ${i > 0 ? "border-t" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                          {tx.type === "income"
                            ? <ArrowUpRight size={14} className="text-emerald-600" />
                            : <ArrowDownRight size={14} className="text-red-500" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {tx.category}
                            {tx.description.startsWith("Sold:") && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Inventory</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ml-3 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                        {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
};

export default History;
