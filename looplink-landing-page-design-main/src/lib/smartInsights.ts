/**
 * Smart Insights — zero API calls, pure local logic
 * - Missed transaction detector
 * - Auto category suggestions from description
 * - Auto insights (transport, category patterns)
 * - Personalization via behavior memory
 */

import { Transaction } from "./db";

// ── Behavior memory ───────────────────────────────────────────────────────────
const BEHAVIOR_KEY = "aje_behavior";

interface BehaviorMemory {
  descToCategory: Record<string, string>; // "transport" → "Transport"
  topCategories: string[];                // most used expense categories
  avgDailyRevenue: number;
  lastUpdated: string;
}

export function loadBehavior(): BehaviorMemory {
  try {
    return JSON.parse(localStorage.getItem(BEHAVIOR_KEY) ?? "{}") as BehaviorMemory;
  } catch {
    return { descToCategory: {}, topCategories: [], avgDailyRevenue: 0, lastUpdated: "" };
  }
}

export function learnFromTransaction(type: "income" | "expense", description: string, category: string) {
  try {
    const mem = loadBehavior();
    if (!mem.descToCategory) mem.descToCategory = {};
    // Learn keyword → category mapping from first 2 words of description
    const key = description.toLowerCase().split(" ").slice(0, 2).join(" ").trim();
    if (key.length > 2) mem.descToCategory[key] = category;
    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(mem));
  } catch { /* */ }
}

export function learnFromHistory(transactions: Transaction[]) {
  try {
    const mem = loadBehavior();
    const today = new Date().toISOString().split("T")[0];
    if (mem.lastUpdated === today) return; // only relearn once per day

    // Build desc→category map from history
    if (!mem.descToCategory) mem.descToCategory = {};
    transactions.forEach(t => {
      if (t.description && t.category) {
        const key = t.description.toLowerCase().split(" ").slice(0, 2).join(" ").trim();
        if (key.length > 2) mem.descToCategory[key] = t.category;
      }
    });

    // Top expense categories
    const catCount: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      catCount[t.category] = (catCount[t.category] || 0) + 1;
    });
    mem.topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);

    // Avg daily revenue (last 14 days)
    const days: Record<string, number> = {};
    transactions.filter(t => t.type === "income").forEach(t => {
      const d = t.created_at?.split("T")[0] ?? "";
      if (d) days[d] = (days[d] || 0) + t.amount;
    });
    const vals = Object.values(days);
    mem.avgDailyRevenue = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    mem.lastUpdated = today;

    localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(mem));
  } catch { /* */ }
}

// ── Smart category suggestion ─────────────────────────────────────────────────
const KEYWORD_CATEGORIES: [string[], string][] = [
  [["transport", "uber", "bolt", "okada", "bus", "taxi", "fuel", "petrol"], "Transport"],
  [["rent", "shop", "store", "office", "space"], "Rent"],
  [["staff", "salary", "worker", "employee", "wage", "pay"], "Staff"],
  [["food", "rice", "beans", "yam", "bread", "water", "drink", "snack"], "Food"],
  [["airtime", "data", "mtn", "glo", "airtel", "9mobile"], "Airtime/Data"],
  [["market", "stock", "goods", "supply", "purchase", "buy", "bought"], "Stock"],
  [["advert", "marketing", "promo", "flyer", "social"], "Marketing"],
  [["light", "nepa", "electricity", "generator", "gen", "diesel"], "Utilities"],
  [["sold", "sale", "customer", "client", "revenue"], "Product Sale"],
  [["service", "repair", "fix", "install", "consult"], "Service"],
];

export function suggestCategory(description: string, type: "income" | "expense"): string {
  const d = description.toLowerCase();

  // Check learned behavior first
  const mem = loadBehavior();
  if (mem.descToCategory) {
    const key = d.split(" ").slice(0, 2).join(" ").trim();
    if (mem.descToCategory[key]) return mem.descToCategory[key];
  }

  // Keyword matching
  for (const [keywords, category] of KEYWORD_CATEGORIES) {
    if (keywords.some(k => d.includes(k))) return category;
  }

  return type === "income" ? "Product Sale" : "Other";
}

// ── Missed transaction detector ───────────────────────────────────────────────
export interface MissedTxHint {
  message: string;
  severity: "info" | "warning";
}

export function detectMissedTransactions(transactions: Transaction[]): MissedTxHint | null {
  const today = new Date().toISOString().split("T")[0];
  const hour = new Date().getHours();

  const todayTx = transactions.filter(t => t.created_at?.startsWith(today));
  const todayIncome = todayTx.filter(t => t.type === "income");
  const todayExpenses = todayTx.filter(t => t.type === "expense");

  // Pattern: expenses recorded but no income (after 12pm)
  if (hour >= 12 && todayExpenses.length > 0 && todayIncome.length === 0) {
    return {
      message: "You recorded expenses but no sales today. Did you receive any money?",
      severity: "warning",
    };
  }

  // Pattern: only 1 income entry but multiple expenses (likely missed sales)
  if (todayIncome.length === 1 && todayExpenses.length >= 3) {
    return {
      message: "You have many expenses but only 1 sale recorded. You may have missed some income.",
      severity: "info",
    };
  }

  // Pattern: no activity after 6pm
  if (hour >= 18 && todayTx.length === 0) {
    return {
      message: "No transactions recorded today. Don't let money go untracked.",
      severity: "warning",
    };
  }

  return null;
}

// ── Auto insights (category patterns) ────────────────────────────────────────
export interface AutoInsight {
  text: string;
  type: "info" | "warning" | "praise";
}

export function generateAutoInsights(transactions: Transaction[]): AutoInsight[] {
  const insights: AutoInsight[] = [];
  const today = new Date().toISOString().split("T")[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const prevWeekAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];

  const thisWeek = transactions.filter(t => (t.created_at?.split("T")[0] ?? "") >= weekAgo);
  const lastWeek = transactions.filter(t => {
    const d = t.created_at?.split("T")[0] ?? "";
    return d >= prevWeekAgo && d < weekAgo;
  });

  // Category spending comparison this week vs last
  const catSpend = (txs: Transaction[], cat: string) =>
    txs.filter(t => t.type === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0);

  const cats = ["Transport", "Stock", "Staff", "Rent", "Marketing", "Food", "Utilities"];
  for (const cat of cats) {
    const thisAmt = catSpend(thisWeek, cat);
    const lastAmt = catSpend(lastWeek, cat);
    if (thisAmt > 0 && lastAmt > 0 && thisAmt > lastAmt * 1.3) {
      insights.push({
        text: `You spent ${Math.round((thisAmt / lastAmt - 1) * 100)}% more on ${cat} this week (₦${thisAmt.toLocaleString()})`,
        type: "warning",
      });
    }
  }

  // Top expense category this week
  const expCats: Record<string, number> = {};
  thisWeek.filter(t => t.type === "expense").forEach(t => {
    expCats[t.category] = (expCats[t.category] || 0) + t.amount;
  });
  const topCat = Object.entries(expCats).sort((a, b) => b[1] - a[1])[0];
  if (topCat && topCat[1] > 0) {
    insights.push({
      text: `Biggest expense this week: ${topCat[0]} — ₦${topCat[1].toLocaleString()}`,
      type: "info",
    });
  }

  // Revenue streak
  const last5Days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    return transactions.filter(t => t.type === "income" && t.created_at?.startsWith(d)).length > 0;
  });
  const streak = last5Days.findIndex(v => !v);
  if (streak >= 3) {
    insights.push({ text: `${streak} days in a row with sales recorded 🔥`, type: "praise" });
  }

  return insights.slice(0, 2); // max 2 insights at a time
}
