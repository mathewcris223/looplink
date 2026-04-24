// ── In-App Alert System ───────────────────────────────────────────────────────
// Triggers on page load from existing data — no backend, no push notifications
// Alerts are computed from transactions + inventory + cash records

import { Transaction, InventoryItem } from "./db";

export type AlertLevel = "danger" | "warning" | "good" | "info";

export interface AppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  action?: { label: string; path: string };
  dismissKey?: string; // localStorage key — if set, user can dismiss for today
}

// ── Alert rules ───────────────────────────────────────────────────────────────

export function computeAlerts(
  transactions: Transaction[],
  inventoryItems: InventoryItem[],
  cashMismatchAmount: number | null // from CashMismatch system, null = not checked
): AppAlert[] {
  const alerts: AppAlert[] = [];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const hour = new Date().getHours();

  const todayTx = transactions.filter(t => t.created_at?.startsWith(today));
  const yesterdayTx = transactions.filter(t => t.created_at?.startsWith(yesterday));

  const todayRevenue = todayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const todayProfit = todayRevenue - todayExpenses;

  const yesterdayRevenue = yesterdayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const yesterdayExpenses = yesterdayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // ── RULE 1: No activity today (after 10am) ────────────────────────────────
  if (todayTx.length === 0 && hour >= 10) {
    const dismissKey = `alert_no_activity_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "no_activity",
        level: hour >= 16 ? "danger" : "warning",
        title: hour >= 16 ? "No sales recorded today" : "Haven't recorded yet today",
        message: hour >= 16
          ? "It's late and you have no records. Don't let money go untracked."
          : "Start recording your transactions to track today's money.",
        action: { label: "Add now", path: "/today" },
        dismissKey,
      });
    }
  }

  // ── RULE 2: Cash mismatch detected ───────────────────────────────────────
  if (cashMismatchAmount !== null && cashMismatchAmount > 100) {
    alerts.push({
      id: "cash_missing",
      level: "danger",
      title: `₦${cashMismatchAmount.toLocaleString()} is missing`,
      message: "Your actual cash is less than expected. Check your records.",
      action: { label: "Check cash", path: "/today" },
    });
  }

  // ── RULE 3: Expenses rising (> 70% of revenue today) ─────────────────────
  if (todayRevenue > 0 && todayExpenses > todayRevenue * 0.7) {
    const dismissKey = `alert_high_expenses_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "high_expenses",
        level: "warning",
        title: "Expenses are very high today",
        message: `You've spent ₦${todayExpenses.toLocaleString()} against ₦${todayRevenue.toLocaleString()} revenue. Only ${Math.round((1 - todayExpenses / todayRevenue) * 100)}% left as profit.`,
        action: { label: "View history", path: "/history" },
        dismissKey,
      });
    }
  }

  // ── RULE 4: Revenue dropped vs yesterday (> 40% drop) ────────────────────
  if (yesterdayRevenue > 0 && todayRevenue > 0 && todayRevenue < yesterdayRevenue * 0.6) {
    const dismissKey = `alert_revenue_drop_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "revenue_drop",
        level: "warning",
        title: "Revenue dropped today",
        message: `Today: ₦${todayRevenue.toLocaleString()} vs yesterday: ₦${yesterdayRevenue.toLocaleString()}. That's a big drop.`,
        dismissKey,
      });
    }
  }

  // ── RULE 5: Losing money today ────────────────────────────────────────────
  if (todayTx.length > 0 && todayProfit < 0 && hour >= 14) {
    const dismissKey = `alert_losing_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "losing_money",
        level: "danger",
        title: "You are losing money today",
        message: `Expenses exceed revenue by ₦${Math.abs(todayProfit).toLocaleString()}. Review your spending.`,
        action: { label: "View records", path: "/history" },
        dismissKey,
      });
    }
  }

  // ── RULE 6: Out of stock items ────────────────────────────────────────────
  const outOfStock = inventoryItems.filter(i => i.status === "out_of_stock");
  if (outOfStock.length > 0) {
    const dismissKey = `alert_out_of_stock_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "out_of_stock",
        level: "danger",
        title: `${outOfStock.length} item${outOfStock.length > 1 ? "s" : ""} out of stock`,
        message: outOfStock.slice(0, 2).map(i => i.name).join(", ") + (outOfStock.length > 2 ? ` +${outOfStock.length - 2} more` : "") + " — restock now.",
        action: { label: "View stock", path: "/stock" },
        dismissKey,
      });
    }
  }

  // ── RULE 7: Low stock items ───────────────────────────────────────────────
  const lowStock = inventoryItems.filter(i => i.status === "low_stock");
  if (lowStock.length > 0 && outOfStock.length === 0) {
    const dismissKey = `alert_low_stock_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "low_stock",
        level: "warning",
        title: `${lowStock.length} item${lowStock.length > 1 ? "s" : ""} running low`,
        message: lowStock.slice(0, 2).map(i => i.name).join(", ") + " — consider restocking soon.",
        action: { label: "View stock", path: "/stock" },
        dismissKey,
      });
    }
  }

  // ── RULE 8: Good day message ──────────────────────────────────────────────
  if (todayProfit > 0 && todayExpenses < todayRevenue * 0.4 && todayTx.length >= 3) {
    const dismissKey = `alert_good_day_${today}`;
    if (!isDismissed(dismissKey)) {
      alerts.push({
        id: "good_day",
        level: "good",
        title: "Strong day so far 🔥",
        message: `₦${todayProfit.toLocaleString()} profit with low expenses. Keep it up.`,
        dismissKey,
      });
    }
  }

  // Sort: danger first, then warning, then good/info
  const order: AlertLevel[] = ["danger", "warning", "good", "info"];
  return alerts.sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
}

// ── Dismiss helpers ───────────────────────────────────────────────────────────
function isDismissed(key: string): boolean {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

export function dismissAlert(key: string): void {
  try { localStorage.setItem(key, "1"); } catch { /* */ }
}
