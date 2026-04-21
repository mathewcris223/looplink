import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import { getTransactions, Transaction } from "@/lib/db";
import { ArrowUpRight, ArrowDownRight, Plus, BarChart3, MessageSquare, Brain, TrendingUp, TrendingDown, CheckCircle2, Flame } from "lucide-react";

const CHECKIN_KEY = "ll_checkin";

function hasCheckedInToday(): boolean {
  try {
    return localStorage.getItem(CHECKIN_KEY) === new Date().toISOString().split("T")[0];
  } catch { return false; }
}
function markCheckedIn() {
  try { localStorage.setItem(CHECKIN_KEY, new Date().toISOString().split("T")[0]); } catch { /* */ }
}
function getActivityStreak(): number {
  try {
    const raw = localStorage.getItem("ll_activity_streak");
    if (!raw) return 0;
    const { streak, lastDate } = JSON.parse(raw);
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    if (lastDate === today || lastDate === yesterday) return streak;
    return 0;
  } catch { return 0; }
}
function incrementStreak() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const raw = localStorage.getItem("ll_activity_streak");
    let streak = 1;
    if (raw) {
      const { streak: s, lastDate } = JSON.parse(raw);
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (lastDate === today) return; // already counted today
      if (lastDate === yesterday) streak = s + 1;
    }
    localStorage.setItem("ll_activity_streak", JSON.stringify({ streak, lastDate: today }));
  } catch { /* */ }
}

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSmartAdd, setShowSmartAdd] = useState(false);
  const [addType, setAddType] = useState<"income" | "expense">("income");
  const [checkedIn, setCheckedIn] = useState(hasCheckedInToday());
  const [streak] = useState(getActivityStreak());

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!bizLoading && !authLoading && user && businesses.length === 0) navigate("/onboarding");
  }, [bizLoading, authLoading, businesses, user, navigate]);

  const loadTx = useCallback(async () => {
    if (!activeBusiness) return;
    try {
      const data = await getTransactions(activeBusiness.id, 50);
      setTransactions(data);
    } catch { /* silent */ }
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
  const todayIncome = todayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayProfit = todayIncome - todayExpenses;

  // Key insight
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const insight = expenseRatio > 70
    ? `⚠️ You're spending ${expenseRatio.toFixed(0)}% of income on expenses`
    : todayProfit > 0
    ? `✅ You've made ₦${todayProfit.toLocaleString()} profit today`
    : transactions.length === 0
    ? "👋 Start by recording your first transaction"
    : `📊 Keep tracking to see your business grow`;

  const handleCheckin = () => {
    if (checkedIn) return;
    markCheckedIn();
    incrementStreak();
    setCheckedIn(true);
    setShowSmartAdd(true);
  };

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-muted-foreground text-sm">{greeting},</p>
        <h1 className="font-display text-2xl font-bold">
          <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">{activeBusiness.name}</p>
      </div>

      {/* Today's Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary/10 border p-5 mb-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Today's Summary</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="text-base font-bold text-emerald-600">₦{todayIncome.toLocaleString()}</p>
          </div>
          <div className="text-center border-x">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="text-base font-bold text-red-500">₦{todayExpenses.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Profit</p>
            <p className={`text-base font-bold ${todayProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {todayProfit >= 0 ? "+" : ""}₦{todayProfit.toLocaleString()}
            </p>
          </div>
        </div>
        {/* Key insight */}
        <div className="rounded-xl bg-card/80 border px-3 py-2.5 text-xs text-foreground font-medium">
          {insight}
        </div>
      </div>

      {/* 4 Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          {
            label: "Add Transaction",
            desc: "Record income or expense",
            icon: Plus,
            color: "bg-primary text-primary-foreground",
            action: () => setShowSmartAdd(true),
          },
          {
            label: "View Dashboard",
            desc: "See full analytics",
            icon: BarChart3,
            color: "bg-blue-50 text-blue-700 border",
            action: () => navigate("/dashboard"),
          },
          {
            label: "Ask AI",
            desc: "Get business advice",
            icon: MessageSquare,
            color: "bg-violet-50 text-violet-700 border",
            action: () => navigate("/chat"),
          },
          {
            label: "Learn",
            desc: "Daily challenge & tips",
            icon: Brain,
            color: "bg-amber-50 text-amber-700 border",
            action: () => navigate("/learn"),
          },
        ].map(({ label, desc, icon: Icon, color, action }) => (
          <button key={label} onClick={action}
            className={`flex flex-col items-start gap-2 p-4 rounded-2xl ${color} active:scale-95 transition-all duration-150 text-left shadow-sm`}>
            <Icon size={22} />
            <div>
              <p className="text-sm font-bold leading-tight">{label}</p>
              <p className="text-xs opacity-70 mt-0.5">{desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Daily Check-in */}
      <div className={`rounded-2xl border p-4 mb-5 ${checkedIn ? "bg-emerald-50 border-emerald-200" : "bg-card"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${checkedIn ? "bg-emerald-100" : "bg-muted"}`}>
              {checkedIn ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Plus size={20} className="text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{checkedIn ? "Recorded today ✓" : "Record today's transactions"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {checkedIn ? "Great job staying on top of your finances" : "Have you recorded today's transactions?"}
              </p>
            </div>
          </div>
          {!checkedIn && (
            <button onClick={handleCheckin}
              className="shrink-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform">
              Record
            </button>
          )}
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-amber-600">
            <Flame size={14} /> {streak}-day activity streak
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Recent Activity</p>
            <button onClick={() => navigate("/history")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {transactions.slice(0, 4).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${tx.type === "income" ? "bg-emerald-100" : "bg-red-100"}`}>
                    {tx.type === "income"
                      ? <ArrowUpRight size={13} className="text-emerald-600" />
                      : <ArrowDownRight size={13} className="text-red-500" />}
                  </div>
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                </div>
                <span className={`text-sm font-bold shrink-0 ml-2 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                  {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddTransactionModal
          businessId={activeBusiness.id}
          defaultType={addType}
          onClose={() => setShowAddModal(false)}
          onSaved={loadTx}
        />
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
