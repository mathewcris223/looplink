// Global challenge state — prevents re-answering across pages (Home, Dashboard, Learn)
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import {
  ChallengeProfile, ChallengeQuestion,
  getOrCreateProfile, hasAnsweredToday, pickTodayQuestion, submitAnswer,
  getLevelInfo, getNextLevelInfo, getLevelProgress, getStreakMilestone, getMotivationalMessage,
} from "@/lib/challenge";
import { Transaction } from "@/lib/db";

const LOCAL_KEY = "ll_challenge_local";

function getLocalProfile(): ChallengeProfile {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw) as ChallengeProfile;
  } catch { /* */ }
  return { id: "local", user_id: "local", current_streak: 0, longest_streak: 0, total_correct: 0, level: 1, last_answer_date: null, badges: [], question_history: [] };
}

function saveLocalProfile(p: ChallengeProfile) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)); } catch { /* */ }
}

function localSubmit(profile: ChallengeProfile, question: ChallengeQuestion, idx: number) {
  const correct = idx === question.correctIndex;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const newStreak = profile.last_answer_date === yesterday ? profile.current_streak + 1 : 1;
  const newCorrect = correct ? profile.total_correct + 1 : profile.total_correct;
  const newProfile: ChallengeProfile = {
    ...profile,
    current_streak: newStreak,
    longest_streak: Math.max(profile.longest_streak, newStreak),
    total_correct: newCorrect,
    level: getLevelInfo(newCorrect).level,
    last_answer_date: today,
    question_history: [...profile.question_history, question.id].slice(-50),
  };
  saveLocalProfile(newProfile);
  return { correct, newProfile };
}

interface ChallengeResult { correct: boolean; message: string; }

interface ChallengeContextType {
  profile: ChallengeProfile | null;
  question: ChallengeQuestion | null;
  loading: boolean;
  selected: number | null;
  result: ChallengeResult | null;
  submitting: boolean;
  answeredToday: boolean;
  handleAnswer: (idx: number) => Promise<void>;
  levelInfo: ReturnType<typeof getLevelInfo>;
  nextLevel: ReturnType<typeof getNextLevelInfo>;
  progress: number;
  streak: number;
  milestone: string | null;
}

const ChallengeContext = createContext<ChallengeContextType | null>(null);

export const ChallengeProvider = ({ children, transactions }: { children: ReactNode; transactions: Transaction[] }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ChallengeProfile | null>(null);
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [useLocal, setUseLocal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        try {
          const p = await getOrCreateProfile(user.id);
          setProfile(p);
          setUseLocal(false);
          if (!hasAnsweredToday(p)) setQuestion(pickTodayQuestion(p, transactions));
          return;
        } catch { /* fall through to local */ }
      }
      const p = getLocalProfile();
      setProfile(p);
      setUseLocal(true);
      if (!hasAnsweredToday(p)) setQuestion(pickTodayQuestion(p, transactions));
    } finally { setLoading(false); }
  }, [user]); // intentionally omit transactions to avoid re-loading on every tx change

  useEffect(() => { load(); }, [load]);

  const handleAnswer = useCallback(async (idx: number) => {
    if (submitting || selected !== null || result !== null || !profile || !question) return;
    setSelected(idx);
    setSubmitting(true);
    try {
      let correct: boolean;
      let newProfile: ChallengeProfile;
      if (useLocal) {
        ({ correct, newProfile } = localSubmit(profile, question, idx));
      } else {
        try {
          ({ correct, newProfile } = await submitAnswer(profile, question, idx));
        } catch {
          ({ correct, newProfile } = localSubmit(profile, question, idx));
          setUseLocal(true);
        }
      }
      setProfile(newProfile);
      setResult({ correct, message: getMotivationalMessage(correct, newProfile.current_streak) });
    } catch { setSelected(null); }
    finally { setSubmitting(false); }
  }, [profile, question, submitting, selected, result, useLocal]);

  const answeredToday = hasAnsweredToday(profile);
  const levelInfo = getLevelInfo(profile?.total_correct ?? 0);
  const nextLevel = getNextLevelInfo(profile?.total_correct ?? 0);
  const progress = getLevelProgress(profile?.total_correct ?? 0);
  const streak = profile?.current_streak ?? 0;
  const milestone = getStreakMilestone(streak);

  return (
    <ChallengeContext.Provider value={{ profile, question, loading, selected, result, submitting, answeredToday, handleAnswer, levelInfo, nextLevel, progress, streak, milestone }}>
      {children}
    </ChallengeContext.Provider>
  );
};

export const useChallenge = () => {
  const ctx = useContext(ChallengeContext);
  if (!ctx) throw new Error("useChallenge must be inside ChallengeProvider");
  return ctx;
};
