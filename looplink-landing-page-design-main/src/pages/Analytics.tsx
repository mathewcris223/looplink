import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, Transaction } from "@/lib/db";
import { getWeeklyTrend, getExpenseBreakdown } from "@/lib/ai";
import { BarChart3, TrendingUp, TrendingDown, PieChart } from "lucide-react";

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    try { setTransactions(await getTransactions(activeBusiness.id, 200)); } catch {}
  }, [activeBusiness]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || bizLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || !activeBusiness) return null;

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const weekly = getWeeklyTrend(transactions);
  const breakdown = getExpenseBreakdown(transactions);
  const maxBar = Math.max(...weekly.map(d => Math.max(d.income, d.expense)), 1);

  // Income sources
  const incSources: Record<string, number> = {};
  transactions.filter(t => t.type === "income").forEach(t => {
    incSources[t.description] = (incSources[t.description] || 0) + t.amount;
  });
  const topSources = Object.entries(incSources).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness} onAddBusiness={() => navigate("/onboarding")}>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">{activeBusiness.name} · All time</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Income", value: `₦${income.toLocaleString()}`, color: "text-emerald-600" },
          { label: "Total Expenses", value: `₦${expenses.toLocaleString()}`, color: "text-red-500" },
          { label: "Net Profit", value: `${profit >= 0 ? "+" : ""}₦${profit.toLocaleString()}`, color: profit >= 0 ? "text-emerald-600" : "text-red-500" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-lg font-bold font-display ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly trend */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 size={16} className="text-primary" />
            <h2 className="font-display font-semibold">This Week's Trend</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <>
              <div className="flex items-end gap-2 h-40 mb-3">
                {weekly.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t-sm bg-emerald-400/80 transition-all duration-700" style={{ height: `${(d.income / maxBar) * 130}px` }} />
                      <div className="w-full rounded-t-sm bg-red-400/80 transition-all duration-700" style={{ height: `${(d.expense / maxBar) * 130}px` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-3">
                {weekly.map(d => <span key={d.day}>{d.day}</span>)}
              </div>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400/80 inline-block" /> Income</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400/80 inline-block" /> Expenses</span>
              </div>
            </>
          )}
        </div>

        {/* Expense breakdown */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <PieChart size={16} className="text-primary" />
            <h2 className="font-display font-semibold">Expense Breakdown</h2>
          </div>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No expenses yet</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(b => (
                <div key={b.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{b.name}</span>
                    <span className="text-muted-foreground">₦{b.value.toLocaleString()} · {b.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Income sources */}
        <div className="rounded-2xl border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-display font-semibold">Top Income Sources</h2>
          </div>
          {topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No income recorded yet</p>
          ) : (
            <div className="space-y-2">
              {topSources.map(([src, val]) => (
                <div key={src} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/40">
                  <span className="text-sm font-medium truncate">{src}</span>
                  <span className="text-sm font-bold text-emerald-600 shrink-0 ml-2">₦{val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Analytics;
