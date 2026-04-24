import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import AppShell from "@/components/dashboard/AppShell";
import SmartAddModal from "@/components/dashboard/SmartAddModal";
import CashMismatch from "@/components/dashboard/CashMismatch";
import AlertBanner from "@/components/dashboard/AlertBanner";
import QuickSellModal from "@/components/dashboard/QuickSellModal";
import BulkInputModal from "@/components/dashboard/BulkInputModal";
import { computeAlerts } from "@/lib/alerts";
import { runBrain } from "@/lib/brain";
import { useInventory } from "@/context/InventoryContext";
import { getInventorySales, InventorySale, getTransactions, Transaction, InventoryItem } from "@/lib/db";
import { computeSalesVelocity } from "@/lib/ai";
import { Plus, ShoppingCart, ArrowUpRight, ArrowDownRight, TrendingDown, Lightbulb, AlertCircle } from "lucide-react";
import { learnFromHistory, detectMissedTransactions, generateAutoInsights } from "@/lib/smartInsights";

type Status = "good" | "warning" | "bad" | "empty";

function getStatus(profit: number, revenue: number, expenses: number, txCount: number): Status {
  if (txCount === 0) return "empty";
  if (profit > 0 && expenses < revenue * 0.6) return "good";
  if (profit > 0) return "warning";
  return "bad";
}

// Dynamic hero background — changes the whole feel of the screen
const STATUS_HERO = {
  good:    { gradient: "from-emerald-500 to-emerald-600", text: "text-white", sub: "text-emerald-100", label: "Good day 🟢", dot: "bg-white/40" },
  warning: { gradient: "from-amber-500 to-orange-500",    text: "text-white", sub: "text-amber-100",   label: "Watch it 🟡", dot: "bg-white/40" },
  bad:     { gradient: "from-red-500 to-red-600",         text: "text-white", sub: "text-red-100",     label: "Losing money 🔴", dot: "bg-white/40" },
  empty:   { gradient: "from-slate-700 to-slate-800",     text: "text-white", sub: "text-slate-300",   label: "No data yet", dot: "bg-white/20" },
};

const BRAIN_COLORS = {
  insight: "bg-white/10 border-white/20 text-white",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  risk:    "bg-red-50 border-red-200 text-red-800",
  praise:  "bg-emerald-50 border-emerald-200 text-emerald-800",
  action:  "bg-blue-50 border-blue-200 text-blue-800",
};

const Today = () => {
  const { user, loading: authLoading } = useAuth();
  const { businesses, activeBusiness, setActiveBusiness, loading: bizLoading } = useBusiness();
  const { inventoryItems } = useInventory();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventorySales, setInventorySales] = useState<InventorySale[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addScreen, setAddScreen] = useState<"revenue" | "expense">("revenue");
  const [showQuickSell, setShowQuickSell] = useState(false);
  const [quickSellItem, setQuickSellItem] = useState<InventoryItem | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/login"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!bizLoading && !authLoading && user && businesses.length === 0) navigate("/onboarding");
  }, [bizLoading, authLoading, businesses, user, navigate]);

  const loadTx = useCallback(async () => {
    if (!activeBusiness) return;
    setTxLoading(true);
    try {
      const [txData, salesData] = await Promise.all([
        getTransactions(activeBusiness.id, 200),
        getInventorySales(activeBusiness.id),
      ]);
      setTransactions(txData);
      setInventorySales(salesData);
    }
    catch { /* silent */ }
    finally { setTxLoading(false); }
  }, [activeBusiness]);

  useEffect(() => { loadTx(); }, [loadTx]);

  if (authLoading || bizLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
  if (!user || !activeBusiness) return null;

  // ── Calculations ──────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];

  const todayTx = transactions.filter(t => t.created_at?.startsWith(todayStr));

  const todayRevenue = todayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayProfit = todayRevenue - todayExpenses;

  const status = getStatus(todayProfit, todayRevenue, todayExpenses, todayTx.length);
  const hero = STATUS_HERO[status];
  const isPositive = todayProfit >= 0;
  const dateStr = new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });

  // ── Brain report ──────────────────────────────────────────────────────────
  const brain = runBrain(transactions, inventoryItems, inventorySales);

  // ── Smart insights ────────────────────────────────────────────────────────
  learnFromHistory(transactions);
  const missedTx = detectMissedTransactions(transactions);
  const autoInsights = generateAutoInsights(transactions);

  return (
    <AppShell businesses={businesses} activeBusiness={activeBusiness} onSelectBusiness={setActiveBusiness}>
      {/* ── HERO CARD — full-width colored header, changes with performance ── */}
      <div className={`-mx-4 md:-mx-6 lg:-mx-8 mb-5 bg-gradient-to-br ${hero.gradient} px-5 pt-5 pb-6`}>
        <div className="flex items-center justify-between mb-4">
          <p className={`text-xs font-medium ${hero.sub}`}>{dateStr}</p>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/15`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hero.dot}`} />
            <span className={hero.text}>{hero.label}</span>
          </div>
        </div>

        {/* Big number */}
        {txLoading ? (
          <div className="h-14 bg-white/10 rounded-2xl animate-pulse" />
        ) : todayTx.length === 0 ? (
          <div>
            <h1 className={`text-3xl font-bold ${hero.text}`}>No money recorded</h1>
            <p className={`text-sm mt-1 ${hero.sub}`}>Tap a button below to start</p>
          </div>
        ) : (
          <div>
            <p className={`text-xs font-medium mb-1 ${hero.sub}`}>{isPositive ? "You made" : "You lost"} today</p>
            <h1 className={`text-5xl font-bold leading-none tracking-tight ${hero.text}`}>
              {isPositive ? "+" : "-"}₦{Math.abs(todayProfit).toLocaleString()}
            </h1>
            <div className={`flex gap-4 mt-3 text-sm ${hero.sub}`}>
              <span>↑ ₦{todayRevenue.toLocaleString()} in</span>
              <span>↓ ₦{todayExpenses.toLocaleString()} out</span>
            </div>
          </div>
        )}

        {/* Brain headline — inside hero, feels integrated */}
        <div className={`mt-4 rounded-xl bg-white/15 px-3.5 py-2.5`}>
          <p className={`text-xs font-semibold ${hero.text} leading-snug`}>{brain.headline}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Alerts — max 2 */}
        <AlertBanner alerts={computeAlerts(transactions, inventoryItems, null).slice(0, 2)} />

        {/* Action buttons */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <button
            onClick={() => { setAddScreen("revenue"); setShowAdd(true); }}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-emerald-500 text-white font-bold active:scale-[0.97] transition-all shadow-md shadow-emerald-500/20 touch-manipulation"
          >
            <ArrowUpRight size={20} />
            <span className="text-xs font-bold">Revenue</span>
          </button>
          <button
            onClick={() => { setAddScreen("expense"); setShowAdd(true); }}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-red-500 text-white font-bold active:scale-[0.97] transition-all shadow-md shadow-red-500/20 touch-manipulation"
          >
            <ArrowDownRight size={20} />
            <span className="text-xs font-bold">Expense</span>
          </button>
          <button
            onClick={() => setShowQuickSell(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-primary text-primary-foreground font-bold active:scale-[0.97] transition-all shadow-md shadow-primary/20 touch-manipulation"
          >
            <ShoppingCart size={20} />
            <span className="text-xs font-bold">Sell Stock</span>
          </button>
          <button
            onClick={() => setShowBulk(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl bg-violet-500 text-white font-bold active:scale-[0.97] transition-all shadow-md shadow-violet-500/20 touch-manipulation"
          >
            <span className="text-lg">📋</span>
            <span className="text-xs font-bold">Bulk</span>
          </button>
        </div>

        {/* Upload & Analyze — feature card */}
        <button
          onClick={() => navigate("/upload")}
          className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-[0.98] transition-all mb-4 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <span className="text-lg">📂</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-blue-800">Upload & Analyze</p>
            <p className="text-xs text-blue-600">Import bank statements or Excel files — get instant insights</p>
          </div>
          <span className="text-blue-400 shrink-0 text-lg">→</span>
        </button>

        {/* Missed transaction detector */}
        {missedTx && (
          <div className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-3 border ${
            missedTx.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
          }`}>
            <AlertCircle size={15} className={`shrink-0 mt-0.5 ${missedTx.severity === "warning" ? "text-amber-600" : "text-blue-500"}`} />
            <p className={`text-xs font-medium ${missedTx.severity === "warning" ? "text-amber-800" : "text-blue-700"}`}>{missedTx.message}</p>
          </div>
        )}

        {/* Auto insights */}
        {autoInsights.length > 0 && (
          <div className="space-y-2 mb-3">
            {autoInsights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 border ${
                ins.type === "warning" ? "bg-amber-50 border-amber-200" :
                ins.type === "praise" ? "bg-emerald-50 border-emerald-200" :
                "bg-muted/40 border-border"
              }`}>
                <Lightbulb size={14} className={`shrink-0 mt-0.5 ${
                  ins.type === "warning" ? "text-amber-500" :
                  ins.type === "praise" ? "text-emerald-500" : "text-muted-foreground"
                }`} />
                <p className={`text-xs font-medium ${
                  ins.type === "warning" ? "text-amber-800" :
                  ins.type === "praise" ? "text-emerald-700" : "text-foreground"
                }`}>{ins.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Cash check */}
        <CashMismatch
          businessId={activeBusiness.id}
          todayIncome={todayRevenue}
          todayExpenses={todayExpenses}
        />

        {/* Today's transactions */}
        {todayTx.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Today ({todayTx.length})
            </p>
            <div className="space-y-2">
              {todayTx.slice(0, 6).map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-xl bg-card border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-7 rounded-full shrink-0 ${tx.type === "income" ? "bg-emerald-500" : "bg-red-400"}`} />
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ml-3 ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.type === "income" ? "+" : "-"}₦{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {todayTx.length > 6 && (
                <button onClick={() => navigate("/history")} className="w-full text-center text-sm text-primary py-2 hover:underline">
                  +{todayTx.length - 6} more →
                </button>
              )}
            </div>
          </div>
        )}

        {!txLoading && todayTx.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">
            Tap Revenue, Expense, or Sell Stock to record your first entry today.
          </p>
        )}
      </div>

      {showBulk && (
        <BulkInputModal
          businessId={activeBusiness.id}
          onClose={() => setShowBulk(false)}
          onSaved={() => { setShowBulk(false); loadTx(); }}
        />
      )}
      {showAdd && (
        <SmartAddModal
          businessId={activeBusiness.id}
          defaultScreen={addScreen}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); loadTx(); }}
        />
      )}
      {showQuickSell && (
        <QuickSellModal
          businessId={activeBusiness.id}
          items={inventoryItems}
          defaultItem={quickSellItem ?? undefined}
          onClose={() => { setShowQuickSell(false); setQuickSellItem(null); }}
          onSaved={() => { setShowQuickSell(false); setQuickSellItem(null); loadTx(); }}
        />
      )}
    </AppShell>
  );
};

export default Today;
