import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import { getTransactions, Transaction } from "@/lib/db";
import { generateCoachReport, CoachReport } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import { Brain, CheckCircle2, AlertTriangle, TrendingUp, XCircle, Lightbulb } from "lucide-react";

const Coach = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [report, setReport] = useState<CoachReport | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!activeBusiness) return;
    try { setTransactions(await getTransactions(activeBusiness.id)); } catch {}
  }, [activeBusiness]);

  useEffect(() => { load(); }, [load]);

  if (authLoading || bizLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || !activeBusiness) return null;

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await generateCoachReport(transactions, activeBusiness.type, activeBusiness.name);
      setReport(result);
    } catch {
      // generateCoachReport has its own fallback, this shouldn't happen
    } finally {
      setAnalyzing(false);
    }
  };

  const sections = report ? [
    { icon: CheckCircle2, title: "What's Working", items: report.working, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
    { icon: AlertTriangle, title: "Problems Detected", items: report.problems, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    { icon: Lightbulb, title: "What to Improve", items: report.improve, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
    { icon: XCircle, title: "What to Stop", items: report.stop, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    { icon: TrendingUp, title: "Growth Strategy", items: report.strategy, color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  ] : [];

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-1">AI Business Coach</h1>
        <p className="text-muted-foreground text-sm">{activeBusiness.name} · Powered by Aje AI</p>
      </div>

      {/* CTA card */}
      {!report && (
        <div className="rounded-3xl border bg-card p-10 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center mx-auto mb-5">
            <Brain size={28} className="text-primary-foreground" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">Analyze My Business</h2>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Get a full AI-powered analysis of your business — what's working, what's wrong, and exactly what to do next.
          </p>
          <Button
            variant="hero"
            size="lg"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-full px-10"
          >
            {analyzing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Analyzing…
              </span>
            ) : (
              <><Brain size={16} /> Analyze My Business</>
            )}
          </Button>
          {transactions.length === 0 && (
            <p className="text-xs text-muted-foreground mt-4">Add transactions first for a more accurate analysis.</p>
          )}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Analysis complete for <strong>{activeBusiness.name}</strong></p>
            <Button variant="hero-outline" size="sm" className="rounded-full" onClick={() => { setReport(null); }}>
              Re-analyze
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
            {sections.map(({ icon: Icon, title, items, color, bg }) => (
              <div key={title} className={`rounded-2xl border p-5 ${bg}`}>
                <div className={`flex items-center gap-2 mb-3 ${color}`}>
                  <Icon size={16} />
                  <h3 className="font-display font-semibold text-sm">{title}</h3>
                </div>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className={`text-xs leading-relaxed flex items-start gap-2 ${color}`}>
                      <span className="mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Coach;
