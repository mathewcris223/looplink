// ── Daily Money Challenge — question bank, logic, and Supabase integration ───

import { supabase } from "./supabase";
import { Transaction } from "./db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChallengeQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: "profit" | "expenses" | "cashflow" | "inventory" | "decisions" | "habits";
  difficulty: "easy" | "medium" | "hard";
}

export interface ChallengeProfile {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_correct: number;
  level: number;
  last_answer_date: string | null;
  badges: string[];
  question_history: string[];
}

export interface DailyState {
  profile: ChallengeProfile | null;
  todayQuestion: ChallengeQuestion | null;
  answeredToday: boolean;
  lastAnswerCorrect: boolean | null;
}

// ── Level system ──────────────────────────────────────────────────────────────

export const LEVELS = [
  { level: 1, title: "Beginner", minCorrect: 0, maxCorrect: 9 },
  { level: 2, title: "Smart Earner", minCorrect: 10, maxCorrect: 29 },
  { level: 3, title: "Profit Builder", minCorrect: 30, maxCorrect: 74 },
  { level: 4, title: "Cashflow Master", minCorrect: 75, maxCorrect: 149 },
  { level: 5, title: "Business Expert", minCorrect: 150, maxCorrect: 299 },
  { level: 6, title: "Elite I", minCorrect: 300, maxCorrect: 449 },
  { level: 7, title: "Elite II", minCorrect: 450, maxCorrect: 649 },
  { level: 8, title: "Elite III", minCorrect: 650, maxCorrect: 899 },
  { level: 9, title: "Strategist", minCorrect: 900, maxCorrect: 1199 },
  { level: 10, title: "Mastermind", minCorrect: 1200, maxCorrect: 1599 },
  { level: 11, title: "Tycoon", minCorrect: 1600, maxCorrect: Infinity },
];

export const STREAK_MILESTONES = [
  { days: 3, title: "Getting Started", badge: "streak_3" },
  { days: 7, title: "Consistent", badge: "streak_7" },
  { days: 30, title: "Disciplined", badge: "streak_30" },
  { days: 100, title: "Unstoppable", badge: "streak_100" },
];

export function getLevelInfo(totalCorrect: number) {
  return LEVELS.find(l => totalCorrect >= l.minCorrect && totalCorrect <= l.maxCorrect) ?? LEVELS[LEVELS.length - 1];
}

export function getNextLevelInfo(totalCorrect: number) {
  const current = getLevelInfo(totalCorrect);
  return LEVELS.find(l => l.level === current.level + 1) ?? null;
}

export function getLevelProgress(totalCorrect: number): number {
  const current = getLevelInfo(totalCorrect);
  const next = getNextLevelInfo(totalCorrect);
  if (!next) return 100;
  const range = next.minCorrect - current.minCorrect;
  const progress = totalCorrect - current.minCorrect;
  return Math.min(100, Math.round((progress / range) * 100));
}


// ── Question bank (70-80% general, 20-30% personalized) ──────────────────────

export const GENERAL_QUESTIONS: ChallengeQuestion[] = [
  {
    id: "g1", topic: "profit", difficulty: "easy",
    text: "You earned ₦50,000 and spent ₦20,000. What is your profit?",
    options: ["₦20,000", "₦30,000", "₦50,000", "₦70,000"],
    correctIndex: 1,
    explanation: "Profit = Income − Expenses. ₦50,000 − ₦20,000 = ₦30,000. Always track both sides.",
  },
  {
    id: "g2", topic: "inventory", difficulty: "easy",
    text: "You bought goods to resell. Is this an expense or inventory?",
    options: ["Expense", "Inventory", "Income", "Loss"],
    correctIndex: 1,
    explanation: "Goods bought for resale are inventory — not an expense until sold. Misclassifying this hides your real profit.",
  },
  {
    id: "g3", topic: "cashflow", difficulty: "medium",
    text: "Which action improves cash flow the fastest?",
    options: ["Buy more stock", "Collect payments faster", "Hire more staff", "Open a new branch"],
    correctIndex: 1,
    explanation: "Collecting payments faster brings money in immediately. Cash flow is about timing — money in vs money out.",
  },
  {
    id: "g4", topic: "expenses", difficulty: "easy",
    text: "Rent for your shop is an example of which type of cost?",
    options: ["Variable cost", "Fixed cost", "Inventory cost", "Revenue"],
    correctIndex: 1,
    explanation: "Fixed costs stay the same regardless of sales — like rent, salaries, and subscriptions. Variable costs change with output.",
  },
  {
    id: "g5", topic: "profit", difficulty: "medium",
    text: "Your revenue is ₦100,000 and cost of goods is ₦60,000. What is your gross profit?",
    options: ["₦60,000", "₦40,000", "₦160,000", "₦100,000"],
    correctIndex: 1,
    explanation: "Gross Profit = Revenue − Cost of Goods Sold. ₦100,000 − ₦60,000 = ₦40,000. This shows how efficiently you sell.",
  },
  {
    id: "g6", topic: "cashflow", difficulty: "medium",
    text: "A business can be profitable but still run out of cash. True or False?",
    options: ["True", "False"],
    correctIndex: 0,
    explanation: "True. Profit is on paper; cash flow is real money. If customers owe you but haven't paid, you're profitable but cash-poor.",
  },
  {
    id: "g7", topic: "decisions", difficulty: "medium",
    text: "You have ₦50,000 profit. What is the smartest use?",
    options: ["Spend it all on personal needs", "Reinvest part, save part", "Buy luxury items", "Lend it all out"],
    correctIndex: 1,
    explanation: "Smart business owners split profit: reinvest for growth, save for emergencies, and pay themselves reasonably.",
  },
  {
    id: "g8", topic: "inventory", difficulty: "medium",
    text: "Dead stock means:",
    options: ["Stock that expired", "Items that haven't sold in a long time", "Stolen goods", "Returned items"],
    correctIndex: 1,
    explanation: "Dead stock is inventory that isn't selling. It ties up cash and takes up space — review it regularly.",
  },
  {
    id: "g9", topic: "habits", difficulty: "easy",
    text: "How often should a small business owner review their finances?",
    options: ["Once a year", "Only when there's a problem", "Weekly or monthly", "Never — just trust the numbers"],
    correctIndex: 2,
    explanation: "Weekly or monthly reviews catch problems early. Waiting until year-end means small issues become big ones.",
  },
  {
    id: "g10", topic: "profit", difficulty: "hard",
    text: "Your profit margin is 15%. What does this mean?",
    options: ["You keep ₦15 for every ₦100 earned", "You spend ₦15 for every ₦100 earned", "Your expenses are 15%", "You grew by 15%"],
    correctIndex: 0,
    explanation: "Profit margin = (Profit ÷ Revenue) × 100. A 15% margin means you keep ₦15 of every ₦100 in revenue after all costs.",
  },
  {
    id: "g11", topic: "cashflow", difficulty: "hard",
    text: "Which is the best indicator of a healthy business?",
    options: ["High revenue", "Positive cash flow", "Many employees", "Large inventory"],
    correctIndex: 1,
    explanation: "Positive cash flow means more money comes in than goes out. A business can have high revenue but still fail from poor cash flow.",
  },
  {
    id: "g12", topic: "expenses", difficulty: "medium",
    text: "Transport costs for delivering goods to customers is:",
    options: ["Fixed cost", "Variable cost", "Capital expense", "Revenue"],
    correctIndex: 1,
    explanation: "Transport costs vary with the number of deliveries — more sales = more transport. That makes it a variable cost.",
  },
  {
    id: "g13", topic: "decisions", difficulty: "medium",
    text: "Before expanding your business, what should you check first?",
    options: ["Your social media followers", "Your current cash flow and profit", "Your competitor's size", "Your shop's location"],
    correctIndex: 1,
    explanation: "Expansion requires capital. If your current cash flow is weak, expanding will make things worse, not better.",
  },
  {
    id: "g14", topic: "inventory", difficulty: "easy",
    text: "If you sell 10 items at ₦500 each and each cost ₦300, what is your total profit?",
    options: ["₦5,000", "₦3,000", "₦2,000", "₦8,000"],
    correctIndex: 2,
    explanation: "Profit per item = ₦500 − ₦300 = ₦200. Total = ₦200 × 10 = ₦2,000. Always know your profit per unit.",
  },
  {
    id: "g15", topic: "habits", difficulty: "medium",
    text: "What is the purpose of keeping a business emergency fund?",
    options: ["To pay for vacations", "To cover unexpected expenses without borrowing", "To invest in stocks", "To pay employees bonuses"],
    correctIndex: 1,
    explanation: "An emergency fund protects your business from shocks — slow months, equipment failure, or sudden expenses — without debt.",
  },
];

// ── Personalized question generator ──────────────────────────────────────────

export function generatePersonalizedQuestion(transactions: Transaction[]): ChallengeQuestion | null {
  if (!transactions.length) return null;
  const expenses = transactions.filter(t => t.type === "expense");
  const income = transactions.filter(t => t.type === "income");
  if (!expenses.length && !income.length) return null;

  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);
  const profit = totalIncome - totalExpenses;

  // Pick a random personalized question type
  const types = [];
  if (expenses.length > 0) types.push("expense_classify");
  if (totalIncome > 0 && totalExpenses > 0) types.push("profit_calc");
  if (expenses.length > 1) types.push("biggest_expense");
  if (!types.length) return null;

  const type = types[Math.floor(Math.random() * types.length)];

  if (type === "profit_calc") {
    const isProfit = profit >= 0;
    return {
      id: `p_profit_${Date.now()}`,
      topic: "profit",
      difficulty: "easy",
      text: `Based on your recent records: ₦${totalIncome.toLocaleString()} income and ₦${totalExpenses.toLocaleString()} expenses. Are you making a profit or a loss?`,
      options: ["Profit", "Loss", "Break even", "Not enough data"],
      correctIndex: isProfit ? (profit === 0 ? 2 : 0) : 1,
      explanation: `${isProfit ? "Profit" : "Loss"} = Income − Expenses = ₦${Math.abs(profit).toLocaleString()}. ${isProfit ? "Keep growing your income!" : "Focus on reducing expenses or increasing income."}`,
    };
  }

  if (type === "expense_classify" && expenses.length > 0) {
    const recent = expenses[0];
    return {
      id: `p_exp_${Date.now()}`,
      topic: "expenses",
      difficulty: "medium",
      text: `You recently recorded "${recent.description}" as an expense. Is this a fixed or variable cost?`,
      options: ["Fixed cost", "Variable cost", "One-time cost", "Not sure"],
      correctIndex: 2,
      explanation: "One-time costs are neither fixed nor variable — they happen occasionally. Knowing the type helps you budget better.",
    };
  }

  return null;
}

// ── Pick today's question ─────────────────────────────────────────────────────

export function pickTodayQuestion(
  profile: ChallengeProfile | null,
  transactions: Transaction[]
): ChallengeQuestion {
  const history = profile?.question_history ?? [];
  const available = GENERAL_QUESTIONS.filter(q => !history.includes(q.id));
  const pool = available.length > 0 ? available : GENERAL_QUESTIONS;

  // 25% chance of personalized if transactions exist
  if (transactions.length > 0 && Math.random() < 0.25) {
    const personalized = generatePersonalizedQuestion(transactions);
    if (personalized) return personalized;
  }

  // Pick based on level difficulty
  const level = profile?.level ?? 1;
  const difficulty = level <= 2 ? "easy" : level <= 4 ? "medium" : "hard";
  const byDifficulty = pool.filter(q => q.difficulty === difficulty);
  const finalPool = byDifficulty.length > 0 ? byDifficulty : pool;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

// ── Supabase functions ────────────────────────────────────────────────────────

export async function getChallengeProfile(userId: string): Promise<ChallengeProfile | null> {
  const { data } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("user_id", userId)
    .single();
  return data as ChallengeProfile | null;
}

export async function getOrCreateProfile(userId: string): Promise<ChallengeProfile> {
  const existing = await getChallengeProfile(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("daily_challenges")
    .insert({ user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as ChallengeProfile;
}

export function hasAnsweredToday(profile: ChallengeProfile | null): boolean {
  if (!profile?.last_answer_date) return false;
  const today = new Date().toISOString().split("T")[0];
  return profile.last_answer_date === today;
}

export async function submitAnswer(
  profile: ChallengeProfile,
  question: ChallengeQuestion,
  selectedIndex: number
): Promise<{ correct: boolean; newProfile: ChallengeProfile }> {
  const correct = selectedIndex === question.correctIndex;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak logic
  const wasYesterday = profile.last_answer_date === yesterday;
  const newStreak = wasYesterday ? profile.current_streak + 1 : 1;
  const newLongest = Math.max(profile.longest_streak, newStreak);

  // Level and correct count
  const newCorrect = correct ? profile.total_correct + 1 : profile.total_correct;
  const newLevel = getLevelInfo(newCorrect).level;

  // Badges
  const newBadges = [...profile.badges];
  for (const milestone of STREAK_MILESTONES) {
    if (newStreak >= milestone.days && !newBadges.includes(milestone.badge)) {
      newBadges.push(milestone.badge);
    }
  }

  // Question history (keep last 50 to avoid repeats)
  const newHistory = [...profile.question_history, question.id].slice(-50);

  const updates = {
    current_streak: newStreak,
    longest_streak: newLongest,
    total_correct: newCorrect,
    level: newLevel,
    last_answer_date: today,
    badges: newBadges,
    question_history: newHistory,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("daily_challenges")
    .update(updates)
    .eq("user_id", profile.user_id)
    .select()
    .single();
  if (error) throw error;

  return { correct, newProfile: data as ChallengeProfile };
}

export function getStreakMilestone(streak: number): string | null {
  const milestones = [...STREAK_MILESTONES].reverse();
  const hit = milestones.find(m => streak >= m.days);
  return hit?.title ?? null;
}

export function getMotivationalMessage(correct: boolean, streak: number): string {
  if (correct) {
    const messages = [
      "You're thinking like a business owner.",
      "Your financial intelligence is growing.",
      "That's the mindset of a profit builder.",
      "Smart answer — keep that thinking.",
      "You're ahead of most business owners.",
    ];
    if (streak >= 7) return "Incredible consistency — you're building a real habit.";
    if (streak >= 3) return "You're on a roll. Keep the streak alive.";
    return messages[Math.floor(Math.random() * messages.length)];
  } else {
    return "Every wrong answer is a lesson. That's how real learning works.";
  }
}
