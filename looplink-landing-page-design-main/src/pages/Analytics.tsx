import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, Transaction } from "@/lib/db";
import { getWeeklyTrend, getExpenseBreakdown } from "@/lib/ai";
import { BarChart3, TrendingUp, PieChart, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

// ── Number formatter — always full value with commas, never abbreviated ──────
function fmt(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}
function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}₦${n.toLocaleString("en-NG")}`;
}

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

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  const income   = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit   = income - expenses;
  const weekly   = getWeeklyTrend(transactions);
  const breakdown = getExpenseBreakdown(transactions);
  // Cap bar height at 120px to stay inside container
  const maxBar = Math.max(...weekly.map(d => Math.max(d.income, d.expense)), 1);
  const BAR_MAX_PX = 120;

  // Income sources
  const incSources: Record<string, number> = {};
  transactions.filter(t => t.type === "income").forEach(t => {
    incSources[t.description] = (incSources[t.description] || 0) + t.amount;
  });
  const topSources = Object.entries(incSources).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness}
      onSelectBusiness={setActiveBusiness} onAddBusiness={() => navigate("/onboarding")}>

      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">Analytics</h1>
        <p className="text-muted-foreground text-sm">{activeBusiness.name} · All time</p>
      </div>

      {/* ── Summary cards — stacked on mobile, 3-col on md+ ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Income",   value: income,   display: fmt(income),          color: "text-emerald-600", bg: "bg-emerald-50", icon: ArrowUpRight },
          { label: "Total Expenses", value: expenses, display: fmt(expenses),         color: "text-red-500",     bg: "bg-red-50",     icon: ArrowDownRight },
          { label: "Net Profit",     value: profit,   display: fmtSigned(profit),     color: profit >= 0 ? "text-emerald-600" : "text-red-500", bg: profit >= 0 ? "bg-emerald-50" : "bg-red-50", icon: profit >= 0 ? TrendingUp : Minus },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border bg-card p-4 flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div className="min-w-0 flex-1 sm:w-full">
              <p className="text-xs text-muted-foreground mb-0.5">{s.label}</p>
              <p className={`font-bold font-display ${s.color} text-base md:text-lg leading-tight`}>
                {s.display}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">

        {/* ── Weekly trend chart ── */}
        <div className="rounded-2xl border bg-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-primary" />
            <h2 className="font-display font-semibold text-sm md:text-base">This Week's Trend</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            /* overflow-hidden ensures bars never escape the card */
            <div className="overflow-hidden">
              {/* Fixed height container — bars scale within it */}
              <div className="flex items-end gap-1.5 md:gap-2 w-full" style={{ height: `${BAR_MAX_PX + 8}px` }}>
                {weekly.map(d => {
                  const incH = Math.round((d.income / maxBar) * BAR_MAX_PX);
                  const expH = Math.round((d.expense / maxBar) * BAR_MAX_PX);
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                      <div className="w-full flex flex-col items-center gap-px">
                        <div className="w-full rounded-t-sm bg-emerald-400/85 transition-all duration-700"
                          style={{ height: `${incH}px`, minHeight: incH > 0 ? "2px" : "0" }} />
                        <div className="w-full rounded-t-sm bg-red-400/85 transition-all duration-700"
                          style={{ height: `${expH}px`, minHeight: expH > 0 ? "2px" : "0" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Day labels */}
              <div className="flex justify-between mt-2 mb-3">
                {weekly.map(d => (
                  <span key={d.day} className="flex-1 text-center text-[10px] text-muted-foreground">{d.day}</span>
                ))}
              </div>
              {/* Legend */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/85 shrink-0" /> Income
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-400/85 shrink-0" /> Expenses
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Expense breakdown ── */}
        <div className="rounded-2xl border bg-card p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} className="text-primary" />
            <h2 className="font-display font-semibold text-sm md:text-base">Expense Breakdown</h2>
          </div>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No expenses yet</p>
          ) : (
            <div className="space-y-3">
              {breakdown.map(b => (
                <div key={b.name}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {/* Name — wraps instead of truncating */}
                    <span className="text-sm font-medium break-words min-w-0">{b.name}</span>
                    {/* Amount — shrink-0 so it never gets cut */}
                    <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {fmt(b.value)} · {b.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${b.pct}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Top income sources ── */}
        <div className="rounded-2xl border bg-card p-4 md:p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary" />
            <h2 className="font-display font-semibold text-sm md:text-base">Top Income Sources</h2>
          </div>
          {topSources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No income recorded yet</p>
          ) : (
            <div className="space-y-2">
              {topSources.map(([src, val]) => (
                <div key={src} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-muted/40">
                  {/* Source name wraps on mobile */}
                  <span className="text-sm font-medium break-words min-w-0 leading-snug">{src}</span>
                  {/* Amount never truncates */}
                  <span className="text-sm font-bold text-emerald-600 shrink-0 whitespace-nowrap">
                    {fmt(val)}
                  </span>
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
