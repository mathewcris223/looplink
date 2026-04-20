import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Transaction, InventoryItem, InventorySale } from "@/lib/db";
import { computeTruthEngineData, getInsightColor, TruthEngineData } from "@/lib/ai";
import { aiRequest } from "@/lib/aiClient";
import { TrendingUp, TrendingDown, AlertTriangle, Star, DollarSign, Lightbulb, ArrowRight } from "lucide-react";

interface Props {
  transactions: Transaction[];
  inventoryItems: InventoryItem[];
  inventorySales: InventorySale[];
  businessId: string;
  businessType?: string;
  businessName?: string;
}

const colorMap = {
  green: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", icon: "text-emerald-600" },
  red: { bg: "bg-red-50 border-red-200", text: "text-red-700", icon: "text-red-600" },
  yellow: { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", icon: "text-amber-600" },
};

const TruthEngine = ({ transactions, inventoryItems, inventorySales, businessId: _businessId, businessType, businessName }: Props) => {
  const navigate = useNavigate();
  const [data, setData] = useState<Omit<TruthEngineData, "aiTip"> | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactions.length) { setLoading(false); return; }
    setLoading(true);
    const computed = computeTruthEngineData(transactions, inventoryItems, inventorySales);
    setData(computed);
    setLoading(false);

    const fetchTip = async () => {
      try {
        const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const raw = await aiRequest({
          message: `Give me ONE actionable business tip in 15 words or less based on: today P&L N${computed.todayPnL.toLocaleString()}, weekly trend ${computed.weeklyTrendPct > 0 ? "+" : ""}${computed.weeklyTrendPct}%, top expense: ${computed.biggestExpenseCategory?.name ?? "none"}. Return ONLY the tip sentence, no quotes.`,
          businessType,
          businessName,
          totalIncome: income,
          totalExpenses: expenses,
          profit: income - expenses,
          mode: "insights",
        });
        const words = raw.trim().split(/\s+/);
        setAiTip(words.slice(0, 20).join(" "));
      } catch {
        setAiTip(null);
      }
    };
    fetchTip();
  }, [transactions, inventoryItems, inventorySales]);

  const todayTx = transactions.filter(t => t.created_at?.startsWith(new Date().toISOString().split("T")[0]));

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="rounded-2xl border bg-muted/30 p-4 animate-pulse min-w-[200px] md:min-w-0 h-24" />
        ))}
      </div>
    );
  }

  if (todayTx.length < 3 || !data) {
    return (
      <div className="rounded-2xl border bg-muted/20 p-4 text-center text-sm text-muted-foreground">
        <Lightbulb size={16} className="inline mr-2 text-amber-500" />
        Not enough data yet — add today's transactions to see insights
      </div>
    );
  }

  const pnlColor = getInsightColor(data.todayPnL, "pnl");
  const trendColor = getInsightColor(data.weeklyTrendPct, "trend");

  const cards = [
    { icon: data.todayPnL >= 0 ? TrendingUp : TrendingDown, label: "Today's Result", value: `${data.todayPnL >= 0 ? "+" : ""}N${data.todayPnL.toLocaleString()}`, sub: data.todayPnL >= 0 ? "Profit today" : "Loss today", color: pnlColor, cta: null },
    { icon: data.weeklyTrendPct >= 0 ? TrendingUp : TrendingDown, label: "This Week", value: `${data.weeklyTrendPct > 0 ? "+" : ""}${data.weeklyTrendPct}%`, sub: "vs last week", color: trendColor, cta: null },
    { icon: Star, label: "Top Product", value: data.topProduct?.name ?? "No data", sub: data.topProduct ? `N${data.topProduct.profit.toLocaleString()} profit (30d)` : "Record sales to see", color: data.topProduct ? "green" as const : "yellow" as const, cta: data.topProduct ? "/inventory" : null },
    { icon: DollarSign, label: "Biggest Expense", value: data.biggestExpenseCategory?.name ?? "None", sub: data.biggestExpenseCategory ? `N${data.biggestExpenseCategory.total.toLocaleString()} this month` : "No expenses yet", color: data.biggestExpenseCategory ? "red" as const : "green" as const, cta: null },
    { icon: AlertTriangle, label: "Anomaly", value: data.anomaly ? data.anomaly.description : "All normal", sub: data.anomaly ? `N${data.anomaly.amount.toLocaleString()} in ${data.anomaly.category}` : "No unusual spending", color: data.anomaly ? "yellow" as const : "green" as const, cta: null },
    { icon: Lightbulb, label: "AI Tip", value: aiTip ?? "Loading tip...", sub: "Tap to chat with AI", color: "yellow" as const, cta: "/chat" },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
      {cards.map((card, i) => {
        const c = colorMap[card.color];
        const Icon = card.icon;
        return (
          <div key={i}
            onClick={card.cta ? () => navigate(card.cta!) : undefined}
            className={`rounded-2xl border p-4 min-w-[200px] md:min-w-0 ${c.bg} ${card.cta ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{card.label}</p>
              <Icon size={14} className={c.icon} />
            </div>
            <p className={`text-sm font-bold leading-snug break-words ${c.text}`}>{card.value}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground">{card.sub}</p>
              {card.cta && <ArrowRight size={12} className={c.icon} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TruthEngine;
