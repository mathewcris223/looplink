import { Transaction } from "./db";
import { aiRequest } from "./aiClient";

export interface AIInsight {
  type: "success" | "warning" | "danger" | "tip";
  title: string;
  message: string;
}

export interface HealthScore {
  score: number;
  label: "Excellent" | "Good" | "Average" | "Poor" | "Critical";
  color: string;
  bgColor: string;
}

export interface CoachReport {
  working: string[];
  problems: string[];
  improve: string[];
  stop: string[];
  strategy: string[];
}

// ── Business Health Score ────────────────────────────────────────────────────

export interface InventoryMetrics {
  deadStockCount: number;
  highLossItemCount: number;
  outOfStockCount: number;
}

export function calcHealthScore(transactions: Transaction[], inventoryMetrics?: InventoryMetrics): HealthScore {
  if (!transactions.length && !inventoryMetrics) return { score: 0, label: "Poor", color: "text-red-500", bgColor: "bg-red-50" };

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;

  let score = 50;
  if (margin >= 40) score += 30;
  else if (margin >= 25) score += 20;
  else if (margin >= 10) score += 10;
  else if (margin < 0) score -= 20;

  if (expenseRatio < 50) score += 20;
  else if (expenseRatio < 70) score += 10;
  else if (expenseRatio > 90) score -= 20;

  if (transactions.length >= 20) score += 10;
  else if (transactions.length >= 10) score += 5;

  // Inventory penalties
  if (inventoryMetrics) {
    score -= inventoryMetrics.deadStockCount * 2;
    score -= inventoryMetrics.highLossItemCount * 5;
    score -= Math.min(inventoryMetrics.outOfStockCount * 3, 15);
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 80) return { score, label: "Excellent", color: "text-emerald-600", bgColor: "bg-emerald-50" };
  if (score >= 65) return { score, label: "Good", color: "text-green-600", bgColor: "bg-green-50" };
  if (score >= 45) return { score, label: "Average", color: "text-amber-600", bgColor: "bg-amber-50" };
  if (score >= 25) return { score, label: "Poor", color: "text-orange-600", bgColor: "bg-orange-50" };
  return { score, label: "Critical", color: "text-red-600", bgColor: "bg-red-50" };
}

// ── AI-Powered Insights ───────────────────────────────────────────────────────
// Calls the real OpenAI API via Supabase Edge Function.
// Falls back to rule-based insights if the API is unavailable.
export async function generateInsights(
  transactions: Transaction[],
  businessType: string,
  businessName?: string
): Promise<AIInsight[]> {
  if (!transactions.length) {
    return [{ type: "tip", title: "Get Started", message: "Add your first income or expense to start receiving AI insights about your business." }];
  }

  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  try {
    const raw = await aiRequest({
      message: `Analyze this business and give me exactly 4 insights as a JSON array. Each insight must have: type ("success"|"warning"|"danger"|"tip"), title (max 5 words), message (1-2 sentences, specific to the data). Return ONLY valid JSON array, no markdown, no explanation.`,
      businessType,
      businessName,
      transactions: transactions.slice(0, 30),
      totalIncome: income,
      totalExpenses: expenses,
      profit,
      mode: "insights",
    });

    // Parse JSON from AI response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as AIInsight[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
    }
  } catch {
    // Fall through to rule-based fallback
  }

  // Rule-based fallback
  return generateInsightsFallback(transactions, businessType);
}

function generateInsightsFallback(transactions: Transaction[], businessType: string): AIInsight[] {
  const insights: AIInsight[] = [];
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;

  const expByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    expByCategory[t.category] = (expByCategory[t.category] || 0) + t.amount;
  });
  const topExpCategory = Object.entries(expByCategory).sort((a, b) => b[1] - a[1])[0];

  if (margin >= 40) insights.push({ type: "success", title: "Strong Profit Margin", message: `Your ${margin.toFixed(0)}% profit margin is excellent. You're running a healthy business.` });
  else if (margin >= 20) insights.push({ type: "tip", title: "Good Margin, Room to Grow", message: `Your ${margin.toFixed(0)}% margin is solid. Focus on growing income to push it above 40%.` });
  else if (margin < 0) insights.push({ type: "danger", title: "You're Running at a Loss", message: `You're spending more than you earn. Cut expenses immediately or find new income sources.` });
  else insights.push({ type: "warning", title: "Low Profit Margin", message: `Your ${margin.toFixed(0)}% margin is below average. Target at least 25% for a sustainable business.` });

  if (expenseRatio > 80) insights.push({ type: "danger", title: "Expenses Too High", message: `${expenseRatio.toFixed(0)}% of your income goes to expenses. This is unsustainable — review your costs urgently.` });
  if (topExpCategory) {
    const pct = income > 0 ? ((topExpCategory[1] / income) * 100).toFixed(0) : "0";
    insights.push({ type: "tip", title: `High ${topExpCategory[0]} Costs`, message: `${topExpCategory[0]} is your biggest expense at ${pct}% of income. Look for ways to reduce it.` });
  }

  const tipMap: Record<string, AIInsight> = {
    food: { type: "tip", title: "Food Business Tip", message: "Track ingredient costs daily. Perishable waste is a silent profit killer in food businesses." },
    fashion: { type: "tip", title: "Fashion Business Tip", message: "Weekend sales tend to be higher for fashion. Consider running promotions on Fridays." },
    retail: { type: "tip", title: "Retail Tip", message: "Monitor your stock-to-sales ratio. Overstocking ties up cash that could be used elsewhere." },
    online: { type: "tip", title: "Online Business Tip", message: "Track your marketing spend vs revenue. A good ROI is at least 3x your ad spend." },
    service: { type: "tip", title: "Service Business Tip", message: "Your biggest asset is your time. Ensure your rates reflect your true costs." },
  };
  if (tipMap[businessType]) insights.push(tipMap[businessType]);

  return insights.slice(0, 4);
}

// ── AI Coach Report ───────────────────────────────────────────────────────────
// Calls real OpenAI API. Falls back to rule-based if unavailable.
export async function generateCoachReport(
  transactions: Transaction[],
  businessType: string,
  businessName: string
): Promise<CoachReport> {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;

  if (!transactions.length) {
    return {
      working: ["No data yet — start adding transactions to get your full analysis."],
      problems: [],
      improve: ["Add at least 7 days of income and expense data for accurate insights."],
      stop: [],
      strategy: ["Consistency is key. Log every transaction, no matter how small."],
    };
  }

  try {
    const raw = await aiRequest({
      message: `Generate a comprehensive business coach report as a JSON object with exactly these keys: "working" (array of 3-4 strings), "problems" (array of 2-4 strings), "improve" (array of 3-4 strings), "stop" (array of 2-3 strings), "strategy" (array of 3-4 strings). Each string should be 1-2 sentences, specific to the financial data provided. Return ONLY valid JSON, no markdown, no explanation.`,
      businessType,
      businessName,
      transactions: transactions.slice(0, 50),
      totalIncome: income,
      totalExpenses: expenses,
      profit,
      mode: "coach",
    });

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as CoachReport;
      if (parsed.working && parsed.problems && parsed.improve && parsed.stop && parsed.strategy) {
        return parsed;
      }
    }
  } catch {
    // Fall through to rule-based fallback
  }

  return generateCoachReportFallback(transactions, businessType, businessName);
}

function generateCoachReportFallback(transactions: Transaction[], businessType: string, businessName: string): CoachReport {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const profit = income - expenses;
  const margin = income > 0 ? (profit / income) * 100 : 0;
  const expenseRatio = income > 0 ? (expenses / income) * 100 : 100;

  const expByCategory: Record<string, number> = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    expByCategory[t.category] = (expByCategory[t.category] || 0) + t.amount;
  });
  const topExp = Object.entries(expByCategory).sort((a, b) => b[1] - a[1]);

  const incSources: Record<string, number> = {};
  transactions.filter(t => t.type === "income").forEach(t => {
    incSources[t.description] = (incSources[t.description] || 0) + t.amount;
  });
  const topIncome = Object.entries(incSources).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const working: string[] = [];
  const problems: string[] = [];
  const improve: string[] = [];
  const stop: string[] = [];
  const strategy: string[] = [];

  if (!transactions.length) {
    return {
      working: ["No data yet — start adding transactions to get your full analysis."],
      problems: [],
      improve: ["Add at least 7 days of income and expense data for accurate insights."],
      stop: [],
      strategy: ["Consistency is key. Log every transaction, no matter how small."],
    };
  }

  // What's working
  if (margin >= 25) working.push(`Strong profit margin of ${margin.toFixed(0)}% — your pricing is working.`);
  if (topIncome.length) working.push(`Your top income source is "${topIncome[0][0]}" — keep focusing on it.`);
  if (transactions.length >= 10) working.push("You're consistently tracking your business — great habit.");
  if (expenseRatio < 60) working.push("Your expense control is good. You're keeping costs lean.");

  // Problems
  if (margin < 0) problems.push("You are operating at a loss. Expenses exceed income.");
  if (expenseRatio > 80) problems.push(`${expenseRatio.toFixed(0)}% of income goes to expenses — this is critically high.`);
  if (topExp[0] && (topExp[0][1] / income) > 0.3) problems.push(`${topExp[0][0]} costs are eating ${((topExp[0][1] / income) * 100).toFixed(0)}% of your income.`);
  if (transactions.length < 5) problems.push("Not enough data to give a full analysis. Log more transactions.");

  // Improve
  improve.push(`Target a profit margin of at least ${margin < 25 ? "25%" : "40%"} by ${margin < 25 ? "reducing expenses" : "growing income"}.`);
  if (topExp.length > 1) improve.push(`Review your ${topExp[0][0]} and ${topExp[1]?.[0] || ""} expenses — these are your biggest cost drivers.`);
  improve.push("Set a weekly budget for each expense category and stick to it.");
  if (businessType === "food") improve.push("Negotiate better supplier prices or buy in bulk to reduce ingredient costs.");
  if (businessType === "retail") improve.push("Introduce a loyalty program to increase repeat customers.");

  // Stop
  if (topExp[0] && (topExp[0][1] / income) > 0.25) stop.push(`Uncontrolled ${topExp[0][0]} spending — it's your biggest leak.`);
  stop.push("Spending on things that don't directly generate income or reduce costs.");
  if (businessType === "food") stop.push("Overordering perishable stock that goes to waste.");
  if (businessType === "fashion") stop.push("Buying inventory without checking what's actually selling.");

  // Strategy
  strategy.push(`Focus on your top income source and find ways to scale it by 20% in the next 30 days.`);
  strategy.push("Create a simple weekly budget: allocate income to expenses, savings, and reinvestment.");
  if (businessType === "online") strategy.push("Invest in one marketing channel and measure ROI before expanding.");
  if (businessType === "service") strategy.push("Raise your prices by 10-15% — most service businesses undercharge.");
  strategy.push(`Track ${businessName}'s performance weekly. What gets measured gets improved.`);

  return {
    working: working.length ? working : ["Keep logging data to unlock insights."],
    problems: problems.length ? problems : ["No critical issues detected yet."],
    improve: improve.slice(0, 4),
    stop: stop.slice(0, 3),
    strategy: strategy.slice(0, 4),
  };
}

// ── Weekly trend data ────────────────────────────────────────────────────────
export function getWeeklyTrend(transactions: Transaction[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);

  return days.map((day, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const dayTx = transactions.filter(t => t.created_at?.startsWith(dateStr));
    const income = dayTx.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = dayTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { day, income, expense, profit: income - expense };
  });
}

// ── Expense breakdown ────────────────────────────────────────────────────────
export function getExpenseBreakdown(transactions: Transaction[]) {
  const byCategory: Record<string, number> = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
  return Object.entries(byCategory).map(([name, value], i) => ({
    name,
    value,
    pct: total > 0 ? Math.round((value / total) * 100) : 0,
    color: colors[i % colors.length],
  }));
}

// ── Truth Engine Types ────────────────────────────────────────────────────────

export interface TruthEngineData {
  todayPnL: number;
  weeklyTrendPct: number;
  topProduct: { name: string; profit: number } | null;
  biggestExpenseCategory: { name: string; total: number } | null;
  anomaly: { description: string; amount: number; category: string } | null;
  aiTip: string | null;
}

// ── Anomaly detection ─────────────────────────────────────────────────────────

export function detectAnomaly(
  transactions: Transaction[]
): { description: string; amount: number; category: string } | null {
  if (transactions.length < 3) return null;
  const byCategory: Record<string, number[]> = {};
  transactions.forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t.amount);
  });
  let anomaly: { description: string; amount: number; category: string } | null = null;
  for (const [category, amounts] of Object.entries(byCategory)) {
    if (amounts.length < 2) continue;
    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const variance = amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length;
    const stddev = Math.sqrt(variance);
    const threshold = mean + 3 * stddev;
    const flagged = transactions
      .filter(t => t.category === category && t.amount > threshold)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    if (flagged) {
      anomaly = { description: flagged.description, amount: flagged.amount, category };
      break;
    }
  }
  return anomaly;
}

// ── Insight color ─────────────────────────────────────────────────────────────

export function getInsightColor(
  value: number,
  type: 'pnl' | 'trend' | 'expense'
): 'green' | 'red' | 'yellow' {
  if (type === 'expense') return 'red';
  if (value > 0) return 'green';
  if (value < 0) return 'red';
  return 'yellow';
}

// ── Truth Engine data computation ─────────────────────────────────────────────

export function computeTruthEngineData(
  transactions: Transaction[],
  inventoryItems: import('./db').InventoryItem[],
  inventorySales: import('./db').InventorySale[]
): Omit<TruthEngineData, 'aiTip'> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Today P&L
  const todayTx = transactions.filter(t => t.created_at?.startsWith(todayStr));
  const todayPnL = todayTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                 - todayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  // Weekly trend
  const msPerDay = 86400000;
  const weekStart = new Date(now.getTime() - 7 * msPerDay);
  const prevWeekStart = new Date(now.getTime() - 14 * msPerDay);
  const currentWeekRevenue = transactions
    .filter(t => t.type === 'income' && new Date(t.created_at) >= weekStart)
    .reduce((s, t) => s + t.amount, 0);
  const prevWeekRevenue = transactions
    .filter(t => t.type === 'income' && new Date(t.created_at) >= prevWeekStart && new Date(t.created_at) < weekStart)
    .reduce((s, t) => s + t.amount, 0);
  const weeklyTrendPct = prevWeekRevenue > 0
    ? Math.round(((currentWeekRevenue - prevWeekRevenue) / prevWeekRevenue) * 1000) / 10
    : 0;

  // Top product by 30d profit
  const thirtyDaysAgo = new Date(now.getTime() - 30 * msPerDay);
  const recentSales = inventorySales.filter(s => new Date(s.created_at) >= thirtyDaysAgo);
  let topProduct: { name: string; profit: number } | null = null;
  let maxProfit = -Infinity;
  for (const item of inventoryItems) {
    const profit = recentSales
      .filter(s => s.item_id === item.id)
      .reduce((s, sale) => s + (sale.profit ?? 0), 0);
    if (profit > maxProfit) { maxProfit = profit; topProduct = { name: item.name, profit }; }
  }
  if (topProduct && maxProfit <= 0) topProduct = null;

  // Biggest expense category this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.created_at) >= monthStart);
  const byCategory: Record<string, number> = {};
  monthExpenses.forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
  const topCatEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  const biggestExpenseCategory = topCatEntry ? { name: topCatEntry[0], total: topCatEntry[1] } : null;

  return { todayPnL, weeklyTrendPct, topProduct, biggestExpenseCategory, anomaly: detectAnomaly(transactions) };
}

// ── Inventory Intelligence ────────────────────────────────────────────────────

export function computeSalesVelocity(
  sales: import('./db').InventorySale[],
  itemId: string
): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recent = sales.filter(s => s.item_id === itemId && new Date(s.created_at) >= thirtyDaysAgo);
  const totalSold = recent.reduce((s, sale) => s + sale.quantity_sold, 0);
  return totalSold / 30;
}

export function computeDepletionDays(currentStock: number, velocity: number): number | null {
  if (velocity <= 0) return null;
  return Math.round(currentStock / velocity);
}

export function getDepletionLabel(days: number | null): { text: string; color: 'red' | 'yellow' | 'green' | 'gray' } {
  if (days === null) return { text: 'No sales data', color: 'gray' };
  if (days <= 7) return { text: `Runs out in ~${days} days`, color: 'red' };
  if (days <= 14) return { text: `Runs out in ~${days} days`, color: 'yellow' };
  return { text: `~${days} days of stock remaining`, color: 'green' };
}

export function computeItemProfit30d(
  sales: import('./db').InventorySale[],
  itemId: string
): number {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  return sales
    .filter(s => s.item_id === itemId && new Date(s.created_at) >= thirtyDaysAgo)
    .reduce((s, sale) => s + (sale.profit ?? 0), 0);
}

// ── Bulk Transaction Parser ───────────────────────────────────────────────────

export interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number | null;
  description: string;
  category: string;
  confidence: 'high' | 'low';
}

export async function parseTransactions(rawText: string): Promise<ParsedTransaction[]> {
  const prompt = `Parse the following text into a JSON array of transactions. Each item must have:
- type: "income" or "expense"
- amount: number (extract numeric value, null if unclear)
- description: string (what the transaction is for)
- category: string (suggest a category like "Food", "Transport", "Sales", "Stock", "Marketing", etc.)
- confidence: "high" if type and amount are clear, "low" if uncertain

Text: ${rawText}

Return ONLY a valid JSON array. No markdown, no explanation.`;

  const { aiRequest } = await import('./aiClient');
  const raw = await aiRequest({ message: prompt, mode: 'chat' });
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Couldn't parse your input. Try rephrasing or add entries one at a time.");
  const parsed = JSON.parse(match[0]) as ParsedTransaction[];
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("No transactions found in your input.");
  return parsed;
}
