import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { saveDailyEntry, getRecentEntries, DailyEntry } from "@/lib/db";
import { TrendingUp, TrendingDown, LogOut, BarChart3, Lightbulb, History } from "lucide-react";

interface Result {
  profit: number;
  margin: number;
  insight: string;
  status: "good" | "warning" | "danger";
}

const getInsight = (sales: number, expenses: number): Result => {
  const profit = sales - expenses;
  const margin = sales > 0 ? (profit / sales) * 100 : 0;
  const expenseRatio = sales > 0 ? (expenses / sales) * 100 : 100;

  let insight = "";
  let status: Result["status"] = "good";

  if (sales === 0) {
    insight = "Enter your sales to get started.";
    status = "warning";
  } else if (expenseRatio > 90) {
    insight = "🚨 Your expenses are critically high. You're barely breaking even — cut costs immediately.";
    status = "danger";
  } else if (expenseRatio > 70) {
    insight = "⚠️ Your expenses are too high. Try reducing costs to improve your profit margin.";
    status = "warning";
  } else if (margin >= 40) {
    insight = "🎉 Excellent! Your business is performing very well. Keep it up!";
    status = "good";
  } else if (margin >= 20) {
    insight = "✅ Your business is performing well. Look for ways to grow sales further.";
    status = "good";
  } else {
    insight = "📈 Your profit margin is low. Focus on increasing sales or reducing expenses.";
    status = "warning";
  }

  return { profit, margin, insight, status };
};

const statusColors = {
  good: "text-emerald-600 bg-emerald-50 border-emerald-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  danger: "text-red-600 bg-red-50 border-red-200",
};

const Dashboard = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();

  const [sales, setSales] = useState("");
  const [expenses, setExpenses] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [history, setHistory] = useState<DailyEntry[]>([]);

  // Redirect if not logged in (wait for auth to hydrate first)
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Load recent entries
  useEffect(() => {
    if (user) {
      getRecentEntries().then(setHistory).catch(() => {});
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    const s = parseFloat(sales) || 0;
    const ex = parseFloat(expenses) || 0;
    const res = getInsight(s, ex);
    setResult(res);

    // Save to Supabase
    setSaving(true);
    try {
      const saved = await saveDailyEntry(s, ex);
      setHistory((prev) => [saved, ...prev].slice(0, 7));
    } catch (err) {
      setSaveError("Could not save entry. Check your connection.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Top nav */}
      <header className="border-b glass sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-gradient">LoopLink</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              👋 <strong className="text-foreground">{user.name}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-2xl space-y-6">
        {/* Welcome */}
        <div className="animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">
            Welcome back, <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground">Enter today's numbers and get your business insight.</p>
        </div>

        {/* Calculator card */}
        <div
          className="rounded-3xl border bg-card/90 backdrop-blur-xl shadow-xl p-8 space-y-6 animate-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <BarChart3 size={18} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Daily Business Calculator</h2>
              <p className="text-xs text-muted-foreground">Track your profit in seconds</p>
            </div>
          </div>

          <form onSubmit={handleCalculate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="sales">Total Sales (₦)</label>
              <input
                id="sales"
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={sales}
                onChange={(e) => setSales(e.target.value)}
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="expenses">Total Expenses (₦)</label>
              <input
                id="expenses"
                type="number"
                min="0"
                placeholder="e.g. 20000"
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
                className="w-full rounded-xl border bg-muted/40 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
              />
            </div>

            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={saving}
              className="w-full rounded-xl text-base hover:scale-[1.02] transition-transform duration-200"
            >
              {saving ? "Saving…" : "Calculate Profit"}
            </Button>

            {saveError && (
              <p className="text-xs text-destructive text-center">{saveError}</p>
            )}
          </form>

          {/* Result */}
          {result && (
            <div className="space-y-4 pt-2 border-t animate-fade-up">
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="rounded-2xl bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit</p>
                  <p className={`text-xl font-bold font-display ${result.profit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {result.profit >= 0 ? "+" : ""}₦{result.profit.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/50 p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                  <div className={`flex items-center justify-center gap-1 text-xl font-bold font-display ${result.margin >= 20 ? "text-emerald-600" : "text-amber-600"}`}>
                    {result.margin >= 20 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    {result.margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className={`rounded-2xl border p-4 flex items-start gap-3 ${statusColors[result.status]}`}>
                <Lightbulb size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold mb-0.5 uppercase tracking-wide">AI Insight</p>
                  <p className="text-sm leading-relaxed">{result.insight}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent history */}
        {history.length > 0 && (
          <div
            className="rounded-3xl border bg-card/90 backdrop-blur-xl shadow-xl p-8 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <History size={16} className="text-primary" />
              <h3 className="font-display font-semibold">Recent Entries</h3>
            </div>
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-muted/40 text-sm"
                >
                  <span className="text-muted-foreground text-xs">
                    {entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "Today"}
                  </span>
                  <span className="text-muted-foreground">Sales: ₦{entry.sales.toLocaleString()}</span>
                  <span className={entry.profit >= 0 ? "text-emerald-600 font-semibold" : "text-destructive font-semibold"}>
                    {entry.profit >= 0 ? "+" : ""}₦{entry.profit.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
