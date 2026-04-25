import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import DailyWelcome, { shouldShowDailyWelcome, markDailyWelcomeSeen } from "@/components/dashboard/DailyWelcome";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import { getTransactions, getInventorySales, Transaction, InventorySale } from "@/lib/db";
import { calcHealthScore, generateInsights, AIInsight } from "@/lib/ai";
import {
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Lightbulb, Package, AlertTriangle, Clock, Plus,
  BarChart3, MessageSquare, Brain, Sparkles, Activity
} from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { inventoryItems } = useInventory();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);
  const [showWelcome, setShowWelcome] = useState(() => {
    if (shouldShowDailyWelcome()) { markDailyWelcomeSeen(); return true; }
    return false;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("income");
  const [txLoading, setTxLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!bizLoading && !authLoading && user && businesses.length === 0) navigate("/onboarding");
  }, [bizLoading, authLoading, businesses, user, navigate]);

  const loadTransactions = useCallback(async () => {
    if (!activeBusiness) return;
    setTxLoading(true);
    try {
      const [data, sales] = await Promise.all([
        getTransactions(activeBusiness.id),
        getInventorySales(activeBusiness.id),
      ]);
      setTransactions(data);
      setInventorySales(sales);
      setInsightsLoading(true);
      try {
        const ai = await generateInsights(data, activeBusiness.type, activeBusiness.name);
        setInsights(ai);
      } catch { /* silent */ }
      finally { setInsightsLoading(false); }
    } catch { /* silent */ }
    finally { setTxLoading(false); }
  }, [activeBusiness]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const health = calcHealthScore(transactions);
  const recent = transactions.slice(0, 6);

  const insightColors: Record<string, string> = {
    success: "bg-emerald-50 border-emerald-100 text-emerald-800",
    warning: "bg-amber-50 border-amber-100 text-amber-800",
    danger: "bg-red-50 border-red-100 text-red-800",
    tip: "bg-blue-50 border-blue-100 text-blue-800",
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {showWelcome && user && (
        <DailyWelcome userName={user.name} onDismiss={() => setShowWelcome(false)} />
      )}

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"},{" "}
            {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeBusiness.name} · {activeBusiness.type}</p>
        </div>
        <button
          onClick={() => setShowSmartAdd(true)}
          className="hidden md:flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* ── Section 1: Key Metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          {
            label: "Total Revenue",
            value: `₦${income.toLocaleString()}`,
            change: income > 0 ? "+this period" : "No data yet",
            icon: TrendingUp,
            positive: true,
          },
          {
            label: "Total Expenses",
            value: `₦${expenses.toLocaleString()}`,
            change: expenses > 0 ? "this period" : "No data yet",
            icon: TrendingDown,
            positive: false,
          },
          {
            label: "Net Profit",
            value: `${profit >= 0 ? "+" : ""}₦${profit.toLocaleString()}`,
            change: profit >= 0 ? "Profitable" : "Loss",
            icon: profit >= 0 ? ArrowUpRight : ArrowDownRight,
            positive: profit >= 0,
          },
          {
            label: "Health Score",
            value: `${health.score}`,
            change: health.label,
            icon: Activity,
            positive: health.score >= 50,
          },
        ].map(({ label, value, change, icon: Icon, positive }) => (
          <div key={label} className="bg-card border rounded-2xl p-4 md:p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${positive ? "bg-emerald-50" : "bg-red-50"}`}>
                <Icon size={15} className={positive ? "text-emerald-600" : "text-red-500"} />
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${positive ? "text-foreground" : "text-red-500"}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{change}</p>
          </div>
        ))}
      </div>

      {/* ── Section 2: Main Actions ── */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Add Transaction", desc: "Record revenue or expense", icon: Plus, action: () => setShowSmartAdd(true), accent: "bg-primary/10 text-primary border-primary/20" },
            { label: "Analytics", desc: "Charts & trends", icon: BarChart3, action: () => navigate("/analytics"), accent: "bg-blue-50 text-blue-700 border-blue-100" },
            { label: "Inventory", desc: "Stock & products", icon: Package, action: () => navigate("/inventory"), accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
            { label: "AI Assistant", desc: "Chat, coach & insights", icon: Sparkles, action: () => navigate("/ai"), accent: "bg-violet-50 text-violet-700 border-violet-100" },
          ].map(({ label, desc, icon: Icon, action, accent }) => (
            <button key={label} onClick={action}
              className={`flex flex-col items-start gap-3 p-4 rounded-2xl border ${accent} hover:shadow-sm active:scale-[0.98] transition-all text-left`}>
              <div className="w-9 h-9 rounded-xl bg-white/60 flex items-center justify-center">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{label}</p>
                <p className="text-xs opacity-70 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 3: Insights + Activity ── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* AI Insights — 3 cols */}
        <div className="lg:col-span-3 bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={15} className="text-primary" />
            <h2 className="text-sm font-semibold">AI Insights</h2>
            {insightsLoading && <span className="text-xs text-muted-foreground ml-auto animate-pulse">Analysing…</span>}
          </div>
          <div className="space-y-2.5">
            {insightsLoading && insights.length === 0
              ? [1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border p-3 bg-muted/20 animate-pulse h-12" />
                ))
              : insights.length === 0
              ? <p className="text-sm text-muted-foreground py-4 text-center">Add transactions to get AI insights.</p>
              : insights.map((ins, i) => (
                  <div key={i} className={`rounded-xl border px-3.5 py-3 ${insightColors[ins.type]}`}>
                    <p className="text-xs font-semibold mb-0.5">{ins.title}</p>
                    <p className="text-xs leading-relaxed opacity-80">{ins.message}</p>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Recent Activity — 2 cols */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-primary" />
              <h2 className="text-sm font-semibold">Recent Activity</h2>
            </div>
            <button onClick={() => navigate("/history")} className="text-xs text-primary hover:underline">All →</button>
          </div>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 rounded-xl bg-muted/30 animate-pulse" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
              <button onClick={() => setShowSmartAdd(true)} className="text-xs text-primary hover:underline mt-1">Add your first →</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {recent.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                      {tx.type === "income"
                        ? <ArrowUpRight size={11} className="text-emerald-600" />
                        : <ArrowDownRight size={11} className="text-red-500" />}
                    </div>
                    <p className="text-xs font-medium truncate">{tx.description}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ml-2 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Inventory alert strip (if issues) ── */}
      {inventoryItems.length > 0 && (() => {
        const outCount = inventoryItems.filter(i => i.status === "out_of_stock").length;
        const lowCount = inventoryItems.filter(i => i.status === "low_stock").length;
        if (outCount === 0 && lowCount === 0) return null;
        return (
          <div className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer ${outCount > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}
            onClick={() => navigate("/inventory")}>
            <AlertTriangle size={15} />
            {outCount > 0
              ? `${outCount} item${outCount > 1 ? "s" : ""} out of stock — tap to manage`
              : `${lowCount} item${lowCount > 1 ? "s" : ""} running low — tap to manage`}
          </div>
        );
      })()}

      {showAddModal && (
        <AddTransactionModal
          businessId={activeBusiness.id}
          defaultType={addType}
          onClose={() => setShowAddModal(false)}
          onSaved={loadTransactions}
        />
      )}
      {showSmartAdd && (
        <SmartAddModal
          businessId={activeBusiness.id}
          onClose={() => setShowSmartAdd(false)}
          onSaved={() => { setShowSmartAdd(false); loadTransactions(); }}
        />
      )}
    </AppShell>
  );
};

export default Dashboard;
