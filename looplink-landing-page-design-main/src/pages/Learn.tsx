import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import DailyChallenge from "@/components/dashboard/DailyChallenge";
import { ChallengeProvider } from "@/context/ChallengeContext";
import { Brain, BookOpen, TrendingUp, DollarSign, Package, Lightbulb, ShieldCheck, Target, Clock, Users, PiggyBank, Repeat } from "lucide-react";

// Large tip bank — rotates daily based on day-of-year
const ALL_TIPS = [
  { icon: DollarSign, title: "Track Every Naira", body: "Record every income and expense, no matter how small. Small leaks sink big ships.", color: "bg-emerald-50 text-emerald-600" },
  { icon: TrendingUp, title: "Know Your Profit Margin", body: "Profit margin = (Profit ÷ Revenue) × 100. Aim for at least 20% to build a sustainable business.", color: "bg-blue-50 text-blue-600" },
  { icon: Package, title: "Manage Your Stock", body: "Dead stock ties up cash. Review slow-moving items monthly and adjust your buying accordingly.", color: "bg-amber-50 text-amber-600" },
  { icon: Brain, title: "Separate Business & Personal", body: "Never mix personal and business money. Open a separate account for your business transactions.", color: "bg-violet-50 text-violet-600" },
  { icon: Lightbulb, title: "Build an Emergency Fund", body: "Save 3 months of operating costs. This protects you from slow periods without needing loans.", color: "bg-rose-50 text-rose-600" },
  { icon: BookOpen, title: "Review Weekly", body: "Spend 15 minutes every week reviewing your income, expenses, and profit. Catch problems early.", color: "bg-teal-50 text-teal-600" },
  { icon: ShieldCheck, title: "Price for Profit", body: "Your selling price must cover cost + overhead + profit. Never price based on what competitors charge alone.", color: "bg-indigo-50 text-indigo-600" },
  { icon: Target, title: "Set Monthly Targets", body: "Set a clear income target every month. What gets measured gets managed. Review at month end.", color: "bg-orange-50 text-orange-600" },
  { icon: Clock, title: "Cash Flow Timing", body: "Profit on paper doesn't pay bills. Focus on when money actually arrives — not just when it's owed.", color: "bg-cyan-50 text-cyan-600" },
  { icon: Users, title: "Know Your Best Customers", body: "20% of your customers bring 80% of your revenue. Identify them and give them extra attention.", color: "bg-pink-50 text-pink-600" },
  { icon: PiggyBank, title: "Pay Yourself First", body: "Set aside your profit before spending on anything else. Even ₦5,000 saved consistently builds wealth.", color: "bg-lime-50 text-lime-600" },
  { icon: Repeat, title: "Reduce Repeat Expenses", body: "Audit your recurring costs every quarter. Cancel anything that doesn't directly grow your business.", color: "bg-sky-50 text-sky-600" },
  { icon: TrendingUp, title: "Upsell to Existing Customers", body: "It costs 5x more to get a new customer than to sell more to an existing one. Focus on retention.", color: "bg-emerald-50 text-emerald-700" },
  { icon: DollarSign, title: "Understand Gross vs Net Profit", body: "Gross profit = Revenue − Cost of goods. Net profit = Gross profit − All expenses. Know both numbers.", color: "bg-blue-50 text-blue-700" },
  { icon: Package, title: "Negotiate with Suppliers", body: "Ask for bulk discounts, extended payment terms, or loyalty pricing. Every ₦ saved is profit gained.", color: "bg-amber-50 text-amber-700" },
  { icon: Lightbulb, title: "Invest in What Works", body: "Double down on your best-selling products or services. Don't spread resources thin across everything.", color: "bg-violet-50 text-violet-700" },
  { icon: ShieldCheck, title: "Keep Receipts", body: "Store all receipts digitally. They protect you during disputes, audits, and tax time.", color: "bg-rose-50 text-rose-700" },
  { icon: Target, title: "Break Even First", body: "Know your break-even point — the minimum sales needed to cover all costs. Aim to exceed it every month.", color: "bg-teal-50 text-teal-700" },
  { icon: Clock, title: "Avoid Lifestyle Inflation", body: "When revenue grows, resist the urge to increase personal spending immediately. Reinvest first.", color: "bg-indigo-50 text-indigo-700" },
  { icon: Users, title: "Ask for Referrals", body: "Happy customers are your best marketers. Ask them to refer friends — offer a small incentive if needed.", color: "bg-orange-50 text-orange-700" },
  { icon: PiggyBank, title: "Tax Planning", body: "Set aside a percentage of every sale for taxes. Getting a surprise tax bill can cripple a business.", color: "bg-cyan-50 text-cyan-700" },
];

// Pick 3 tips for today based on day-of-year (rotates daily)
function getTodaysTips() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const start = (dayOfYear * 3) % ALL_TIPS.length;
  return [
    ALL_TIPS[start % ALL_TIPS.length],
    ALL_TIPS[(start + 1) % ALL_TIPS.length],
    ALL_TIPS[(start + 2) % ALL_TIPS.length],
  ];
}

const Learn = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const todaysTips = useMemo(() => getTodaysTips(), []);

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

      {/* Daily Challenge — global state via ChallengeProvider */}
      <div className="mb-6">
        <ChallengeProvider transactions={[]}>
          <DailyChallenge transactions={[]} />
        </ChallengeProvider>
      </div>

      {/* Today's Business Tips — rotates daily */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today's Business Tips</p>
          <p className="text-[10px] text-muted-foreground">Updates daily</p>
        </div>
        <div className="space-y-3">
          {todaysTips.map(({ icon: Icon, title, body, color }) => (
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
