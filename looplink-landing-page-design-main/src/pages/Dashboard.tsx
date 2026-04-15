import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { TrendingUp, TrendingDown, LogOut, BarChart3, Lightbulb } from "lucide-react";

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

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sales, setSales] = useState("");
  const [expenses, setExpenses] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const s = parseFloat(sales) || 0;
    const ex = parseFloat(expenses) || 0;
    setResult(getInsight(s, ex));
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const statusColors = {
    good: "text-emerald-600 bg-emerald-50 border-emerald-200",
    warning: "text-amber-600 bg-amber-50 border-amber-200",
    danger: "text-red-600 bg-red-50 border-red-200",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Top nav */}
      <header className="border-b glass sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-gradient">LoopLink</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              👋 Welcome, <strong className="text-foreground">{user.name}</strong>
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

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        {/* Welcome */}
        <div className="mb-10 animate-fade-up">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-1">
            Welcome back, <span className="text-gradient">{user.name.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-muted-foreground">Enter today's numbers and get your business insight.</p>
        </div>

        {/* Calculator card */}
        <div className="rounded-3xl border bg-card/90 backdrop-blur-xl shadow-xl p-8 space-y-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-brand flex items-center justify-center">
              <BarChart3 size={18} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Daily Business Calculator</h2>
              <p className="text-xs text-muted-foreground">Track your profit in seconds</p>
            </div>
          </div>

          <form onSubmit={handleCalculate} className="space-y-4">
            {/* Sales */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="sales">
                Total Sales (₦)
              </label>
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

            {/* Expenses */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="expenses">
                Total Expenses (₦)
              </label>
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
              className="w-full rounded-xl text-base hover:scale-[1.02] transition-transform duration-200"
            >
              Calculate Profit
            </Button>
          </form>

          {/* Result */}
          {result && (
            <div className="space-y-4 pt-2 animate-fade-up border-t">
              {/* Profit / Expenses row */}
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

              {/* AI Insight */}
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
      </main>
    </div>
  );
};

export default Dashboard;
