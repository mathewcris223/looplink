import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import { getTransactions, Transaction } from "@/lib/db";
import {
  ArrowUpRight, ArrowDownRight, Plus, BarChart3,
  Brain, Package, CheckCircle2, Flame, Sparkles,
  Building2, TrendingUp, History
} from "lucide-react";

// ── Daily check-in helpers ────────────────────────────────────────────────────
const CHECKIN_KEY = "ll_checkin";
const STREAK_KEY = "ll_activity_streak";

function hasCheckedInToday() {
  try { return localStorage.getItem(CHECKIN_KEY) === new Date().toISOString().split("T")[0]; } catch { return false; }
}
function markCheckedIn() {
  try { localStorage.setItem(CHECKIN_KEY, new Date().toISOString().split("T")[0]); } catch { /* */ }
}
function getStreak() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return 0;
    const { streak, lastDate } = JSON.parse(raw);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    return (lastDate === today || lastDate === yesterday) ? streak : 0;
  } catch { return 0; }
}
function incrementStreak() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem(STREAK_KEY);
    let streak = 1;
    if (raw) {
      const { streak: s, lastDate } = JSON.parse(raw);
      if (lastDate === today) return;
      if (lastDate === new Date(Date.now() - 86400000).toISOString().split("T")[0]) streak = s + 1;
    }
    localStorage.setItem(STREAK_KEY, JSON.stringify({ streak, lastDate: today }));
  } catch { /* */ }
}

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday);
  const [streak] = useState(getStreak);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!bizLoading && !authLoading && user && businesses.length === 0) navigate("/onboarding");
  }, [bizLoading, authLoading, businesses, user, navigate]);

  const loadTx = useCallback(async () => {
    if (!activeBusiness) return;
    try { setTransactions(await getTransactions(activeBusiness.id, 50)); } catch { /* */ }
  }, [activeBusiness]);

  useEffect(() => { loadTx(); }, [loadTx]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayStr = new Date().toISOString().split("T")[0];
  const todayTx = transactions.filter(t => t.created_at?.startsWith(todayStr));
  const todayRevenue = todayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayProfit = todayRevenue - todayExpenses;

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const insight = expenseRatio > 70
    ? `⚠️ Expenses are ${expenseRatio.toFixed(0)}% of revenue — review your costs`
    : todayProfit > 0
    ? `✅ ₦${todayProfit.toLocaleString()} profit recorded today`
    : transactions.length === 0
    ? "👋 Start by recording your first transaction"
    : "📊 Keep recording to unlock AI insights";

  const handleCheckin = () => {
    if (checkedIn) return;
    markCheckedIn();
    incrementStreak();
    setCheckedIn(true);
    setShowSmartAdd(true);
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">
            {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{activeBusiness.name}</p>
        </div>
        <button
          onClick={() => navigate("/businesses")}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-3 py-2 rounded-xl transition-colors shrink-0 mt-1"
        >
          <Building2 size={13} /> Manage
        </button>
      </div>

      {/* ── Today's summary card ── */}
      <div className="bg-card border rounded-2xl p-5 mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Today</p>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: "Revenue", value: `₦${todayRevenue.toLocaleString()}`, color: "text-emerald-600" },
            { label: "Expenses", value: `₦${todayExpenses.toLocaleString()}`, color: "text-red-500" },
            { label: "Profit", value: `${todayProfit >= 0 ? "+" : ""}₦${todayProfit.toLocaleString()}`, color: todayProfit >= 0 ? "text-emerald-600" : "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <p className={`text-base font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
        <div className="bg-muted/40 rounded-xl px-3 py-2.5 text-xs text-foreground/80 font-medium">
          {insight}
        </div>
      </div>

      {/* ── Action grid ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: "Add Transaction", desc: "Record revenue or expense", icon: Plus, style: "bg-primary text-primary-foreground border-transparent", action: () => setShowSmartAdd(true) },
          { label: "Dashboard", desc: "Analytics & insights", icon: BarChart3, style: "bg-card border text-foreground hover:bg-muted/40", action: () => navigate("/dashboard") },
          { label: "AI Hub", desc: "Chat, coach & analytics", icon: Sparkles, style: "bg-card border text-foreground hover:bg-muted/40", action: () => navigate("/ai") },
          { label: "Inventory", desc: "Products & stock", icon: Package, style: "bg-card border text-foreground hover:bg-muted/40", action: () => navigate("/inventory") },
          { label: "Learn", desc: "Daily challenge & tips", icon: Brain, style: "bg-card border text-foreground hover:bg-muted/40", action: () => navigate("/learn") },
          { label: "History", desc: "All transactions", icon: History, style: "bg-card border text-foreground hover:bg-muted/40", action: () => navigate("/history") },
        ].map(({ label, desc, icon: Icon, style, action }) => (
          <button key={label} onClick={action}
            className={`flex flex-col items-start gap-2.5 p-4 rounded-2xl border ${style} active:scale-[0.97] transition-all text-left`}>
            <Icon size={18} />
            <div>
              <p className="text-sm font-semibold leading-tight">{label}</p>
              <p className="text-xs opacity-60 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Daily check-in ── */}
      <div className={`rounded-2xl border p-4 mb-5 transition-colors ${checkedIn ? "bg-emerald-50 border-emerald-200" : "bg-card"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${checkedIn ? "bg-emerald-100" : "bg-muted"}`}>
              {checkedIn
                ? <CheckCircle2 size={18} className="text-emerald-600" />
                : <TrendingUp size={18} className="text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{checkedIn ? "Transactions recorded ✓" : "Record today's transactions"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {checkedIn ? "Great — come back tomorrow" : "Stay on top of your finances daily"}
              </p>
            </div>
          </div>
          {!checkedIn && (
            <button onClick={handleCheckin}
              className="shrink-0 bg-primary text-primary-foreground text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform">
              Record
            </button>
          )}
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-emerald-200 text-xs font-semibold text-amber-600">
            <Flame size={13} /> {streak}-day streak
          </div>
        )}
      </div>

      {/* ── Recent transactions ── */}
      {transactions.length > 0 && (
        <div className="bg-card border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Recent Activity</p>
            <button onClick={() => navigate("/history")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-1.5">
            {transactions.slice(0, 5).map(tx => (
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
        </div>
      )}

      {showSmartAdd && (
        <SmartAddModal
          businessId={activeBusiness.id}
          onClose={() => setShowSmartAdd(false)}
          onSaved={() => { setShowSmartAdd(false); loadTx(); }}
        />
      )}
    </AppShell>
  );
};

export default Home;
