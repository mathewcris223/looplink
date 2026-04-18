import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { useInventory } from "@/context/InventoryContext";
import AppShell from "@/components/dashboard/AppShell";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import { getTransactions, Transaction } from "@/lib/db";
import { calcHealthScore, generateInsights, AIInsight } from "@/lib/ai";
import { TrendingUp, TrendingDown, Plus, Lightbulb, Activity, ArrowUpRight, ArrowDownRight, BarChart3, MessageSquare, Package, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, refreshBusinesses, loading: bizLoading } = useBusiness();
  const { inventoryItems } = useInventory();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("income");
  const [txLoading, setTxLoading] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Only redirect to onboarding if user is fully loaded AND has no businesses
    // This prevents the redirect from firing on every login
    if (!bizLoading && !authLoading && user && businesses.length === 0) {
      navigate("/onboarding");
    }
  }, [bizLoading, authLoading, businesses, user, navigate]);

  const loadTransactions = useCallback(async () => {
    if (!activeBusiness) return;
    setTxLoading(true);
    try {
      const data = await getTransactions(activeBusiness.id, 100);
      setTransactions(data);
      // Load AI insights after transactions are fetched
      setInsightsLoading(true);
      try {
        const aiInsights = await generateInsights(data, activeBusiness.type, activeBusiness.name);
        setInsights(aiInsights);
      } catch { /* silent — insights are non-critical */ }
      finally { setInsightsLoading(false); }
    } catch { /* silent */ }
    finally { setTxLoading(false); }
  }, [activeBusiness]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  if (authLoading || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  }
  if (!user || !activeBusiness) return null;

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;
  const health = calcHealthScore(transactions);
  const recent = transactions.slice(0, 5);

  const insightColors = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-red-700",
    tip: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <AppShell
      businesses={businesses}
      activeBusiness={activeBusiness}
      onSelectBusiness={setActiveBusiness}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{activeBusiness.name} · {activeBusiness.type}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="hero-outline" size="sm" className="rounded-full gap-2" onClick={() => { setAddType("expense"); setShowAddModal(true); }}>
            <ArrowDownRight size={15} /> Add Expense
          </Button>
          <Button variant="hero" size="sm" className="rounded-full gap-2" onClick={() => { setAddType("income"); setShowAddModal(true); }}>
            <Plus size={15} /> Add Income
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {[
          { label: "Total Income", value: `₦${income.toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total Expenses", value: `₦${expenses.toLocaleString()}`, icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-50" },
          { label: "Net Profit", value: `${profit >= 0 ? "+" : ""}₦${profit.toLocaleString()}`, icon: TrendingUp, color: profit >= 0 ? "text-emerald-600" : "text-red-500", bg: profit >= 0 ? "bg-emerald-50" : "bg-red-50" },
          { label: "Profit Margin", value: `${margin.toFixed(1)}%`, icon: Activity, color: margin >= 20 ? "text-emerald-600" : "text-amber-600", bg: margin >= 20 ? "bg-emerald-50" : "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border bg-card p-3 md:p-5 space-y-2 md:space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground font-medium leading-tight">{s.label}</p>
              <div className={`w-10 h-10 rounded-2xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={16} className={s.color} />
              </div>
            </div>
            <p className={`text-xl md:text-2xl font-bold font-display ${s.color} break-all leading-tight`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Left col */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Insights */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-primary" />
              <h2 className="font-display font-semibold">AI Insights</h2>
              {insightsLoading && <span className="text-xs text-muted-foreground ml-auto animate-pulse">AI is thinking…</span>}
            </div>
            <div className="space-y-3">
              {insightsLoading && insights.length === 0 ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="rounded-xl border p-3.5 bg-muted/30 animate-pulse">
                    <div className="h-3 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                ))
              ) : (
                insights.map((ins, i) => (
                  <div key={i} className={`rounded-xl border p-3.5 ${insightColors[ins.type]}`}>
                    <p className="text-xs font-bold mb-0.5">{ins.title}</p>
                    <p className="text-xs leading-relaxed opacity-90">{ins.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold">Recent Transactions</h2>
              <button onClick={() => navigate("/history")} className="text-xs text-primary hover:underline">View all</button>
            </div>
            {txLoading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
            ) : recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No transactions yet.</p>
                <button onClick={() => { setAddType("income"); setShowAddModal(true); }} className="text-primary hover:underline mt-1 text-xs">Add your first one →</button>
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                        {tx.type === "income" ? <ArrowUpRight size={13} className="text-emerald-600" /> : <ArrowDownRight size={13} className="text-red-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} · {new Date(tx.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ml-2 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-1 space-y-6">
          {/* Health score */}
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-primary" />
              <h2 className="font-display font-semibold">Business Health</h2>
            </div>
            <div className="text-center py-2">
              <div className="relative w-28 h-28 mx-auto mb-3">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={health.score >= 65 ? "#10b981" : health.score >= 45 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${(health.score / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold font-display ${health.color}`}>{health.score}</span>
                  <span className="text-[10px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <p className={`text-sm font-semibold ${health.color}`}>{health.label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {health.score >= 65 ? "Your business is healthy" : health.score >= 45 ? "Room for improvement" : "Needs urgent attention"}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="font-display font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              {[
                { label: "Add Income", desc: "Record a sale", icon: ArrowUpRight, color: "emerald", action: () => { setAddType("income"); setShowAddModal(true); } },
                { label: "Add Expense", desc: "Log a cost", icon: ArrowDownRight, color: "red", action: () => { setAddType("expense"); setShowAddModal(true); } },
                { label: "View Analytics", desc: "See your trends", icon: BarChart3, color: "blue", action: () => navigate("/analytics") },
                { label: "AI Chat", desc: "Ask your advisor", icon: MessageSquare, color: "purple", action: () => navigate("/chat") },
              ].map(a => (
                <div
                  key={a.label}
                  onClick={a.action}
                  className="flex items-center gap-3 p-3 rounded-2xl border bg-card cursor-pointer hover:bg-muted/60 hover:scale-[1.02] hover:shadow-md transition-all duration-200"
                >
                  <div className={`w-9 h-9 rounded-xl bg-${a.color}-100 flex items-center justify-center shrink-0`}>
                    <a.icon size={16} className={`text-${a.color}-600`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory summary — always visible */}
          {inventoryItems.length > 0 && (() => {
            const stockValue = inventoryItems.filter(i => i.item_type !== "service").reduce((s, i) => s + (i.quantity ?? 0) * (i.cost_price ?? 0), 0);
            const lowCount = inventoryItems.filter(i => i.status === "low_stock").length;
            const outCount = inventoryItems.filter(i => i.status === "out_of_stock").length;
            // Best seller = item with highest selling price × quantity (proxy for value)
            const bestSeller = [...inventoryItems].sort((a, b) => (b.selling_price * (b.quantity ?? 0)) - (a.selling_price * (a.quantity ?? 0)))[0];
            return (
              <div className="rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-primary" />
                    <h2 className="font-display font-semibold">Inventory</h2>
                  </div>
                  <button onClick={() => navigate("/inventory")} className="text-xs text-primary hover:underline">Manage →</button>
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stock value</span>
                    <span className="font-bold text-emerald-600">₦{stockValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total items</span>
                    <span className="font-semibold">{inventoryItems.length}</span>
                  </div>
                  {bestSeller && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Top item</span>
                      <span className="font-semibold truncate max-w-[120px]">{bestSeller.name}</span>
                    </div>
                  )}
                  {(lowCount > 0 || outCount > 0) && (
                    <div className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl mt-1 ${outCount > 0 ? "bg-red-50 text-red-600 border border-red-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                      <AlertTriangle size={12} />
                      {outCount > 0 ? `${outCount} item${outCount > 1 ? "s" : ""} out of stock` : `${lowCount} item${lowCount > 1 ? "s" : ""} running low`}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Add transaction modal */}
      {showAddModal && (
        <AddTransactionModal
          businessId={activeBusiness.id}
          defaultType={addType}
          onClose={() => setShowAddModal(false)}
          onSaved={loadTransactions}
        />
      )}
    </AppShell>
  );
};

export default Dashboard;
