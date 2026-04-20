// ── Daily Money Challenge — Game Logic Hook ───────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getDailyQuestions, ChallengeQuestion } from "@/lib/challengeQuestions";

export interface ChallengeProgress {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  lastAnswerDate: string | null;
  answeredQuestionIds: string[];
  badges: string[];
  topicCorrect: Record<string, number>;
}

export interface LevelInfo {
  level: number;
  title: string;
  tier: "base" | "elite";
  correctNeeded: number;
  nextTitle: string;
  nextCorrectNeeded: number;
  progress: number; // 0-100
}

const LEVELS = [
  { level: 1, title: "Beginner", correctNeeded: 0, nextCorrectNeeded: 10 },
  { level: 2, title: "Smart Earner", correctNeeded: 10, nextCorrectNeeded: 30 },
  { level: 3, title: "Profit Builder", correctNeeded: 30, nextCorrectNeeded: 75 },
  { level: 4, title: "Cashflow Master", correctNeeded: 75, nextCorrectNeeded: 150 },
  { level: 5, title: "Business Expert", correctNeeded: 150, nextCorrectNeeded: 300 },
  { level: 6, title: "Elite I", correctNeeded: 300, nextCorrectNeeded: 500 },
  { level: 7, title: "Elite II", correctNeeded: 500, nextCorrectNeeded: 750 },
  { level: 8, title: "Elite III", correctNeeded: 750, nextCorrectNeeded: 1000 },
  { level: 9, title: "Strategist", correctNeeded: 1000, nextCorrectNeeded: 1500 },
  { level: 10, title: "Mastermind", correctNeeded: 1500, nextCorrectNeeded: 2500 },
  { level: 11, title: "Tycoon", correctNeeded: 2500, nextCorrectNeeded: 99999 },
];

const STREAK_MILESTONES: Record<number, string> = {
  3: "Getting Started 🌱",
  7: "Consistent 🔥",
  30: "Disciplined 💪",
  100: "Unstoppable 🚀",
};

const BADGE_THRESHOLDS: Record<string, { topic: string; count: number; label: string; emoji: string }> = {
  profit_master: { topic: "profit_loss", count: 5, label: "Profit Master", emoji: "💰" },
  expense_tracker: { topic: "expenses", count: 5, label: "Expense Tracker", emoji: "📊" },
  inventory_pro: { topic: "inventory", count: 5, label: "Inventory Pro", emoji: "📦" },
  cashflow_analyst: { topic: "cash_flow", count: 5, label: "Cashflow Analyst", emoji: "💸" },
  business_strategist: { topic: "business_decisions", count: 5, label: "Business Strategist", emoji: "🧠" },
  money_habit: { topic: "financial_habits", count: 5, label: "Money Habit", emoji: "🏆" },
};

export function getLevelInfo(totalCorrect: number): LevelInfo {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalCorrect >= lvl.correctNeeded) current = lvl;
    else break;
  }
  const idx = LEVELS.indexOf(current);
  const next = LEVELS[idx + 1] ?? current;
  const range = next.correctNeeded - current.correctNeeded;
  const progress = range > 0
    ? Math.min(100, Math.round(((totalCorrect - current.correctNeeded) / range) * 100))
    : 100;
  return {
    level: current.level,
    title: current.title,
    tier: current.level <= 5 ? "base" : "elite",
    correctNeeded: current.correctNeeded,
    nextTitle: next.title,
    nextCorrectNeeded: next.correctNeeded,
    progress,
  };
}

export function getStreakMilestone(streak: number): string | null {
  const milestones = Object.keys(STREAK_MILESTONES).map(Number).sort((a, b) => b - a);
  for (const m of milestones) {
    if (streak >= m) return STREAK_MILESTONES[m];
  }
  return null;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function checkNewBadges(
  topicCorrect: Record<string, number>,
  existingBadges: string[]
): string[] {
  const newBadges: string[] = [];
  for (const [badgeId, config] of Object.entries(BADGE_THRESHOLDS)) {
    if (!existingBadges.includes(badgeId) && (topicCorrect[config.topic] ?? 0) >= config.count) {
      newBadges.push(badgeId);
    }
  }
  return newBadges;
}

export function getBadgeInfo(badgeId: string) {
  return BADGE_THRESHOLDS[badgeId] ?? null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDailyChallenge(userId: string | null, hasUserData: boolean) {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [todayComplete, setTodayComplete] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load or create progress from Supabase
  const loadProgress = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select("*")
        .eq("user_id", userId)
        .single();

      let prog: ChallengeProgress;
      if (error || !data) {
        // Create new record
        prog = {
          userId,
          currentStreak: 0,
          longestStreak: 0,
          totalCorrect: 0,
          lastAnswerDate: null,
          answeredQuestionIds: [],
          badges: [],
          topicCorrect: {},
        };
        await supabase.from("challenge_progress").insert({
          user_id: userId,
          current_streak: 0,
          longest_streak: 0,
          total_correct: 0,
          last_answer_date: null,
          answered_question_ids: [],
          badges: [],
          topic_correct: {},
        });
      } else {
        prog = {
          userId,
          currentStreak: data.current_streak ?? 0,
          longestStreak: data.longest_streak ?? 0,
          totalCorrect: data.total_correct ?? 0,
          lastAnswerDate: data.last_answer_date ?? null,
          answeredQuestionIds: data.answered_question_ids ?? [],
          badges: data.badges ?? [],
          topicCorrect: data.topic_correct ?? {},
        };
      }

      setProgress(prog);

      // Check if already answered today
      const alreadyDone = prog.lastAnswerDate === todayStr();
      setTodayComplete(alreadyDone);

      if (!alreadyDone) {
        const qs = getDailyQuestions(hasUserData, prog.answeredQuestionIds, 2);
        setQuestions(qs);
        setCurrentQIdx(0);
        setSelectedAnswer(null);
        setShowResult(false);
      }
    } catch {
      // Silently fail — challenge is non-critical
    } finally {
      setLoading(false);
    }
  }, [userId, hasUserData]);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const submitAnswer = useCallback(async (answerIdx: number) => {
    if (!progress || selectedAnswer !== null) return;
    const q = questions[currentQIdx];
    if (!q) return;

    setSelectedAnswer(answerIdx);
    setShowResult(true);

    const isCorrect = answerIdx === q.correctIndex;
    const today = todayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Update streak
    let newStreak = progress.currentStreak;
    if (progress.lastAnswerDate === yesterday) {
      newStreak = progress.currentStreak + 1;
    } else if (progress.lastAnswerDate !== today) {
      newStreak = 1; // reset or start
    }

    const newTotalCorrect = isCorrect ? progress.totalCorrect + 1 : progress.totalCorrect;
    const newTopicCorrect = { ...progress.topicCorrect };
    if (isCorrect) {
      newTopicCorrect[q.topic] = (newTopicCorrect[q.topic] ?? 0) + 1;
    }

    const newAnsweredIds = [...new Set([...progress.answeredQuestionIds, q.id])];
    const earnedBadges = checkNewBadges(newTopicCorrect, progress.badges);
    const allBadges = [...progress.badges, ...earnedBadges];

    const updatedProgress: ChallengeProgress = {
      ...progress,
      currentStreak: newStreak,
      longestStreak: Math.max(progress.longestStreak, newStreak),
      totalCorrect: newTotalCorrect,
      lastAnswerDate: today,
      answeredQuestionIds: newAnsweredIds,
      badges: allBadges,
      topicCorrect: newTopicCorrect,
    };

    setProgress(updatedProgress);
    if (earnedBadges.length > 0) setNewBadges(earnedBadges);

    // Persist to Supabase
    try {
      await supabase.from("challenge_progress").upsert({
        user_id: userId,
        current_streak: updatedProgress.currentStreak,
        longest_streak: updatedProgress.longestStreak,
        total_correct: updatedProgress.totalCorrect,
        last_answer_date: today,
        answered_question_ids: newAnsweredIds,
        badges: allBadges,
        topic_correct: newTopicCorrect,
      }, { onConflict: "user_id" });
    } catch { /* silent */ }
  }, [progress, questions, currentQIdx, selectedAnswer, userId]);

  const nextQuestion = useCallback(() => {
    if (currentQIdx + 1 < questions.length) {
      setCurrentQIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setTodayComplete(true);
    }
  }, [currentQIdx, questions.length]);

  const dismissNewBadges = () => setNewBadges([]);

  return {
    progress,
    questions,
    currentQIdx,
    currentQuestion: questions[currentQIdx] ?? null,
    selectedAnswer,
    showResult,
    todayComplete,
    newBadges,
    loading,
    submitAnswer,
    nextQuestion,
    dismissNewBadges,
    levelInfo: progress ? getLevelInfo(progress.totalCorrect) : null,
    streakMilestone: progress ? getStreakMilestone(progress.currentStreak) : null,
  };
}
