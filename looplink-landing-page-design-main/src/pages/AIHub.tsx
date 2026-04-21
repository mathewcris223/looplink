import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { MessageSquare, Brain, BarChart3, ArrowRight, Sparkles } from "lucide-react";

const AIHub = () => {
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

  const options = [
    {
      icon: MessageSquare,
      title: "AI Chat",
      desc: "Ask any question about your business and get instant, intelligent answers based on your data.",
      color: "bg-violet-50 border-violet-200 text-violet-700",
      iconBg: "bg-violet-100",
      path: "/chat",
    },
    {
      icon: Brain,
      title: "AI Coach",
      desc: "Get personalised business advice, strategies, and coaching to help you grow and make better decisions.",
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
      iconBg: "bg-emerald-100",
      path: "/coach",
    },
    {
      icon: BarChart3,
      title: "Analytics",
      desc: "Deep-dive into your income, expenses, trends, and profit with AI-driven insights and charts.",
      color: "bg-blue-50 border-blue-200 text-blue-700",
      iconBg: "bg-blue-100",
      path: "/analytics",
    },
  ];

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">AI Hub</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your intelligent business assistant — powered by AI</p>
      </div>

      {/* 3 Options */}
      <div className="space-y-4">
        {options.map(({ icon: Icon, title, desc, color, iconBg, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-4 p-5 rounded-2xl border ${color} active:scale-[0.98] transition-all duration-150 text-left`}
          >
            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-base">{title}</p>
              <p className="text-xs opacity-75 mt-0.5 leading-relaxed">{desc}</p>
            </div>
            <ArrowRight size={18} className="shrink-0 opacity-50" />
          </button>
        ))}
      </div>

      {/* Tip */}
      <div className="mt-8 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 p-4">
        <p className="text-xs font-semibold text-violet-700 mb-1">💡 Pro tip</p>
        <p className="text-xs text-violet-600 leading-relaxed">
          The AI uses your actual business data — transactions, inventory, and history — to give you personalised answers. The more you record, the smarter it gets.
        </p>
      </div>
    </AppShell>
  );
};

export default AIHub;
