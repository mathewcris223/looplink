import { useState, useEffect, useCallback } from "react";
import { Flame, Trophy, Star, ChevronRight, CheckCircle, XCircle, Zap, Lock } from "lucide-react";
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

const DailyChallenge = ({ transactions }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ChallengeProfile | null>(null);
  const [question, setQuestion] = useState<ChallengeQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // default collapsed — user must click to open

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const p = await getOrCreateProfile(user.id);
      setProfile(p);
      if (!hasAnsweredToday(p)) {
        setQuestion(pickTodayQuestion(p, transactions));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, transactions]);

  useEffect(() => { load(); }, [load]);

  const handleAnswer = async (idx: number) => {
    // Guard: don't allow if already selected, submitting, or missing data
    if (!profile || !question || submitting || selected !== null || result !== null) return;
    // Immediately lock UI with selected index
    setSelected(idx);
    setSubmitting(true);
    try {
      const { correct, newProfile } = await submitAnswer(profile, question, idx);
      setProfile(newProfile);
      setResult({ correct, message: getMotivationalMessage(correct, newProfile.current_streak) });
    } catch (err) {
      // On error, reset so user can retry
      setSelected(null);
      console.error("Challenge submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || loading) return (
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
      {/* Header */}
      <button onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-100/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Flame size={20} className="text-white" />
          </div>
          <div className="text-left">
            <p className="font-display font-bold text-base text-amber-900">🔥 Daily Money Challenge</p>
            <p className="text-xs text-amber-700">
              {answeredToday ? "✅ Completed today — come back tomorrow" : "Answer today's question to grow your streak"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              <Flame size={13} /> {streak} day{streak !== 1 ? "s" : ""}
            </div>
          )}
          <ChevronRight size={16} className={`text-amber-600 transition-transform ${collapsed ? "" : "rotate-90"}`} />
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
              {nextLevel && <span>{nextLevel.minCorrect - (profile?.total_correct ?? 0)} more to {nextLevel.title}</span>}
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Question or completed state */}
          {answeredToday && !result ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-700">Challenge complete for today!</p>
                <p className="text-xs text-emerald-600 mt-0.5">Come back tomorrow to keep your streak.</p>
              </div>
            </div>
          ) : question && !result ? (
            <div className="space-y-3">
              <p className="text-sm font-medium leading-relaxed">{question.text}</p>
              <div className="space-y-2">
                {question.options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(i)} disabled={submitting}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                      selected === i
                        ? i === question.correctIndex
                          ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                          : "bg-red-50 border-red-400 text-red-700"
                        : "bg-muted/40 hover:bg-muted hover:border-primary/40 border-transparent"
                    }`}>
                    <span className="inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : result && question ? (
            <div className="space-y-3">
              {/* Result */}
              <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
                result.correct ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
              }`}>
                {result.correct
                  ? <CheckCircle size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-bold ${result.correct ? "text-emerald-700" : "text-red-700"}`}>
                    {result.correct ? "Correct!" : "Not quite."}
                  </p>
                  <p className="text-xs leading-relaxed mt-1 text-muted-foreground">{question.explanation}</p>
                </div>
              </div>
              {/* Motivation */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">
                <Zap size={13} className="text-amber-500 shrink-0" />
                <span className="italic">{result.message}</span>
              </div>
              {/* Updated streak */}
              {streak > 0 && (
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-600">
                  <Flame size={16} />
                  {streak}-day streak{streak >= 3 ? " 🔥" : ""}
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DailyChallenge;
