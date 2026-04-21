import { useState, useEffect, useCallback } from "react";
import { Flame, Trophy, Star, ChevronRight, CheckCircle, XCircle, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Transaction } from "@/lib/db";
import {
  ChallengeProfile, ChallengeQuestion,
  getOrCreateProfile, hasAnsweredToday, pickTodayQuestion,
  submitAnswer, getLevelInfo, getNextLevelInfo, getLevelProgress,
  getStreakMilestone, getMotivationalMessage,
} from "@/lib/challenge";

interface Props {
  transactions: Transaction[];
}

// Local-storage fallback profile — used when Supabase table doesn't exist yet
const LOCAL_KEY = "ll_challenge_local";

function getLocalProfile(): ChallengeProfile {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw) as ChallengeProfile;
  } catch { /* ignore */ }
  return {
    id: "local",
    user_id: "local",
    current_streak: 0,
    longest_streak: 0,
    total_correct: 0,
    level: 1,
    last_answer_date: null,
    badges: [],
    question_history: [],
  };
}

function saveLocalProfile(p: ChallengeProfile) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

function localSubmit(
  profile: ChallengeProfile,
  question: ChallengeQuestion,
  selectedIndex: number
): { correct: boolean; newProfile: ChallengeProfile } {
  const correct = selectedIndex === question.correctIndex;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const wasYesterday = profile.last_answer_date === yesterday;
  const newStreak = wasYesterday ? profile.current_streak + 1 : 1;
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

const DailyChallenge = ({ transactions }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ChallengeProfile | null>(null);
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [useLocal, setUseLocal] = useState(false); // fallback mode flag

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        // Try Supabase first
        try {
          const p = await getOrCreateProfile(user.id);
          setProfile(p);
          setUseLocal(false);
          if (!hasAnsweredToday(p)) {
            setQuestion(pickTodayQuestion(p, transactions));
          }
          return;
        } catch (dbErr) {
          console.warn("DailyChallenge: DB unavailable, using local fallback", dbErr);
        }
      }
      // Local fallback (no DB or no user)
      const p = getLocalProfile();
      setProfile(p);
      setUseLocal(true);
      if (!hasAnsweredToday(p)) {
        setQuestion(pickTodayQuestion(p, transactions));
      }
    } finally {
      setLoading(false);
    }
  }, [user, transactions]);

  useEffect(() => { load(); }, [load]);

  const handleAnswer = useCallback(async (idx: number) => {
    // Strict guard — only block if already answered or actively submitting
    if (submitting || selected !== null || result !== null) return;
    if (!profile || !question) return;

    // Immediately update UI — don't wait for async
    setSelected(idx);
    setSubmitting(true);

    try {
      let correct: boolean;
      let newProfile: ChallengeProfile;

      if (useLocal) {
        // Local fallback — synchronous
        ({ correct, newProfile } = localSubmit(profile, question, idx));
      } else {
        // Supabase — async, with local fallback on error
        try {
          ({ correct, newProfile } = await submitAnswer(profile, question, idx));
        } catch (dbErr) {
          console.warn("DailyChallenge: submit DB error, falling back to local", dbErr);
          ({ correct, newProfile } = localSubmit(profile, question, idx));
          setUseLocal(true);
        }
      }

      setProfile(newProfile);
      setResult({
        correct,
        message: getMotivationalMessage(correct, newProfile.current_streak),
      });
    } catch (err) {
      console.error("DailyChallenge: unexpected error", err);
      // Reset so user can retry
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }, [profile, question, submitting, selected, result, useLocal]);

  if (loading) return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 animate-pulse shadow-md">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-amber-200" />
        <div className="flex-1">
          <div className="h-4 bg-amber-200 rounded w-1/3 mb-2" />
          <div className="h-3 bg-amber-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-amber-100 rounded w-full mb-2" />
      <div className="h-3 bg-amber-100 rounded w-2/3" />
    </div>
  );

  const levelInfo = getLevelInfo(profile?.total_correct ?? 0);
  const nextLevel = getNextLevelInfo(profile?.total_correct ?? 0);
  const progress = getLevelProgress(profile?.total_correct ?? 0);
  const streak = profile?.current_streak ?? 0;
  const milestone = getStreakMilestone(streak);
  const answeredToday = hasAnsweredToday(profile);

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden shadow-md">
      {/* Header — toggle collapse */}
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 active:bg-amber-100 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shrink-0">
            <Flame size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-base text-amber-900">🔥 Daily Money Challenge</p>
            <p className="text-xs text-amber-700">
              {answeredToday || result
                ? "✅ Completed today — come back tomorrow"
                : "Answer today's question to grow your streak"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Flame size={13} /> {streak} day{streak !== 1 ? "s" : ""}
            </div>
          )}
          <ChevronRight
            size={16}
            className={`text-amber-600 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}
          />
        </div>
      </button>

      {!collapsed && (
        <div className="px-5 pb-5 space-y-4 border-t border-amber-200">
          {/* Level + streak row */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-500" />
              <span className="text-xs font-semibold">{levelInfo.title}</span>
              {milestone && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">
                  {milestone}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star size={12} className="text-amber-400" />
              {profile?.total_correct ?? 0} correct
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Level {levelInfo.level}</span>
              {nextLevel && (
                <span>{nextLevel.minCorrect - (profile?.total_correct ?? 0)} more to {nextLevel.title}</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Already answered (from DB, before this session) */}
          {answeredToday && !result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Challenge complete for today!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Come back tomorrow to keep your streak.</p>
              </div>
            </div>
          )}

          {/* Question — not yet answered */}
          {!answeredToday && question && !result && (
            <div className="space-y-3">
              <p className="text-sm font-semibold leading-relaxed text-amber-900">{question.text}</p>
              <div className="space-y-2">
                {question.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = isSelected && i === question.correctIndex;
                  const isWrong = isSelected && i !== question.correctIndex;
                  const isLocked = selected !== null || submitting;

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={isLocked}
                      onPointerDown={(e) => {
                        // Use onPointerDown for instant mobile response
                        e.preventDefault();
                        if (!isLocked) handleAnswer(i);
                      }}
                      className={[
                        "w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 touch-manipulation select-none",
                        isCorrect
                          ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                          : isWrong
                          ? "bg-red-100 border-red-400 text-red-800"
                          : isLocked
                          ? "bg-muted/30 border-transparent text-muted-foreground opacity-60 cursor-not-allowed"
                          : "bg-white border-amber-200 text-amber-900 hover:border-amber-400 hover:bg-amber-50 active:bg-amber-100 cursor-pointer",
                      ].join(" ")}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        <span className={[
                          "w-6 h-6 rounded-full border-2 text-[11px] font-bold flex items-center justify-center shrink-0",
                          isCorrect ? "border-emerald-500 bg-emerald-500 text-white" :
                          isWrong ? "border-red-400 bg-red-400 text-white" :
                          "border-amber-300 text-amber-700",
                        ].join(" ")}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                        {submitting && isSelected && (
                          <span className="ml-auto text-xs text-muted-foreground animate-pulse">saving…</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result feedback */}
          {result && question && (
            <div className="space-y-3">
              <div className={`rounded-xl px-4 py-3.5 flex items-start gap-3 border-2 ${
                result.correct
                  ? "bg-emerald-50 border-emerald-300"
                  : "bg-red-50 border-red-300"
              }`}>
                {result.correct
                  ? <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  : <XCircle size={20} className="text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-bold ${result.correct ? "text-emerald-700" : "text-red-700"}`}>
                    {result.correct ? "✅ Correct! Well done." : "❌ Incorrect. Try again tomorrow."}
                  </p>
                  <p className="text-xs leading-relaxed mt-1.5 text-muted-foreground">{question.explanation}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100 rounded-xl px-3 py-2.5 border border-amber-200">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <span className="italic">{result.message}</span>
              </div>

              {streak > 0 && (
                <div className="flex items-center gap-2 text-sm font-bold text-amber-600">
                  <Flame size={16} />
                  {streak}-day streak{streak >= 3 ? " 🔥" : ""}
                </div>
              )}

              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">
                  Today's challenge complete — come back tomorrow!
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyChallenge;
