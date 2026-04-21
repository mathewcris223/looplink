import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import DailyChallenge from "@/components/dashboard/DailyChallenge";
import { Brain, BookOpen, TrendingUp, DollarSign, Package, Lightbulb } from "lucide-react";

const tips = [
  {
    icon: DollarSign,
    title: "Track Every Naira",
    body: "Record every income and expense, no matter how small. Small leaks sink big ships.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Know Your Profit Margin",
    body: "Profit margin = (Profit ÷ Revenue) × 100. Aim for at least 20% to build a sustainable business.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Package,
    title: "Manage Your Stock",
    body: "Dead stock ties up cash. Review slow-moving items monthly and adjust your buying accordingly.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: Brain,
    title: "Separate Business & Personal",
    body: "Never mix personal and business money. Open a separate account for your business transactions.",
    color: "bg-violet-50 text-violet-600",
  },
  {
    icon: Lightbulb,
    title: "Build an Emergency Fund",
    body: "Save 3 months of operating costs. This protects you from slow periods without needing loans.",
    color: "bg-rose-50 text-rose-600",
  },
  {
    icon: BookOpen,
    title: "Review Weekly",
    body: "Spend 15 minutes every week reviewing your income, expenses, and profit. Catch problems early.",
    color: "bg-teal-50 text-teal-600",
  },
];

const Learn = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!bizLoading && !authLoading && user && businesses.length === 0) navigate("/onboarding");
  }, [bizLoading, authLoading, businesses, user, navigate]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Learn 📚</h1>
        <p className="text-muted-foreground text-sm mt-1">Build your financial knowledge daily</p>
      </div>

      {/* Daily Challenge — top */}
      <div className="mb-6">
        <DailyChallenge transactions={[]} />
      </div>

      {/* Business Tips */}
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Business Tips</p>
        <div className="space-y-3">
          {tips.map(({ icon: Icon, title, body, color }) => (
            <div key={title} className="rounded-2xl border bg-card p-4 flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-0.5">{title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
};

export default Learn;
