import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, PartyPopper, Gift, Globe, Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { gradeAnswer, recordQuizAttempt, checkQuizEligibility, QUIZ_CASHBACK_REWARD, fetchQuizQuestions, type QuizQuestion } from "@/api/rewardApi";
import { LANG_LABELS, LANG_FLAGS, type QuizLang } from "@/data/quizQuestions";
import resultBackdrop from "@/assets/resultBackdrop.png";

const QUIZ_DURATION_MS = 60_000;

const CONFETTI_COLORS = ["#FFD700", "#FF6B9D", "#10B981", "#6366F1", "#F59E0B", "#EC4899", "#8B5CF6"];
const CONFETTI_COUNT = 15;
const PETAL_COUNT = 24;

function ConfettiParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 6,
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.2,
        rotation: Math.random() * 360,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function FallingPetals() {
  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        size: 16 + Math.random() * 18,
        delay: Math.random() * 1,
        duration: 1.4 + Math.random() * 1.2,
        opacity: 0.6 + Math.random() * 0.4,
        drift: -50 + Math.random() * 100,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            borderRadius: "50% 0 50% 0",
            backgroundColor: `rgba(255,255,255,${p.opacity})`,
            boxShadow: "0 0 6px rgba(255,255,255,0.4)",
            animation: `petal-fall ${p.duration}s ease-in ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

type Phase = "checking" | "ineligible" | "language" | "playing" | "success" | "failed";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LANGUAGES: QuizLang[] = ["en", "hi", "mr", "te", "ta", "kn"];

export default function JanmashtamiQuizModal({ open, onClose }: Props) {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("checking");
  const [selectedLang, setSelectedLang] = useState<QuizLang | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const endAtRef = useRef<number>(0);
  const timerRef = useRef<number>(0);
  const allCorrectRef = useRef(true);

  const resetQuiz = useCallback(() => {
    setPhase("checking");
    setSelectedLang(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedOption(null);
    setSecondsLeft(60);
    setCorrectCount(0);
    setRevealedCorrectIndex(null);
    allCorrectRef.current = true;
  }, []);

  useEffect(() => {
    if (!open) return;
    resetQuiz();
  }, [open, resetQuiz]);

  // One attempt per day: check eligibility before showing the quiz.
  useEffect(() => {
    if (!open || phase !== "checking") return;

    let cancelled = false;

    const run = async () => {
      if (!user?.clientId) {
        if (!cancelled) setPhase("language");
        return;
      }
      try {
        const res = await checkQuizEligibility(user.clientId);
        if (cancelled) return;
        setPhase(res.eligible ? "language" : "ineligible");
      } catch {
        // On any error (e.g. endpoint not available yet), fail open so the
        // quiz still works; eligibility is also enforced server-side.
        if (!cancelled) setPhase("language");
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, phase, user?.clientId]);

  const startQuiz = useCallback(async (lang: QuizLang) => {
    setSelectedLang(lang);
    setLoadingQuestions(true);
    try {
      const picked = await fetchQuizQuestions(lang);
      if (picked && picked.length > 0) {
        setQuestions(picked);
        setPhase("playing");
        setQuestionIndex(0);
        setSelectedOption(null);
        setSecondsLeft(60);
        endAtRef.current = Date.now() + QUIZ_DURATION_MS;
      } else {
        // No questions returned — fall back to the language picker.
        setPhase("language");
      }
    } catch {
      // On error, fall back to the language picker so the user can retry.
      setPhase("language");
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  // Records the final win/loss with the backend once all questions are done.
  const recordAttempt = useCallback(
    async (won: boolean) => {
      if (!user?.clientId) {
        setPhase(won ? "success" : "failed");
        return;
      }
      setSubmitting(true);
      try {
        await recordQuizAttempt(user.clientId, won);
      } catch {
        // idempotent server-side
      } finally {
        setSubmitting(false);
        setPhase(won ? "success" : "failed");
        queryClient.invalidateQueries({ queryKey: ["rewardStatus", user.clientId] });
        queryClient.invalidateQueries({ queryKey: ["quizEligibility", user.clientId] });
      }
    },
    [user?.clientId, queryClient]
  );

  useEffect(() => {
    if (!open || phase !== "playing") {
      window.clearInterval(timerRef.current);
      return;
    }

    timerRef.current = window.setInterval(() => {
      const remainingMs = endAtRef.current - Date.now();
      const remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(remaining);
      if (remainingMs <= 0) {
        window.clearInterval(timerRef.current);
        recordAttempt(false);
      }
    }, 250);

    return () => window.clearInterval(timerRef.current);
  }, [open, phase, recordAttempt]);

  const handleSelect = async (optionIdx: number) => {
    if (phase !== "playing" || selectedOption !== null) return;

    const current = questions[questionIndex];
    const isLast = questionIndex === questions.length - 1;

    setSelectedOption(optionIdx);

    let isCorrect = false;
    let correctIndex: number | null = null;

    if (user?.clientId) {
      try {
        // Each answer is graded by the backend the moment it's selected.
        const result = await gradeAnswer(user.clientId, current.id, optionIdx);
        isCorrect = result.correct;
        correctIndex = result.correctIndex;
      } catch {
        // On grading failure, treat as incorrect (server re-checks on attempt).
        isCorrect = false;
      }
    }

    if (isCorrect) {
      setCorrectCount((c) => c + 1);
    } else {
      allCorrectRef.current = false;
    }

    setRevealedCorrectIndex(correctIndex);

    // Show feedback, then advance or finish.
    window.setTimeout(() => {
      if (isLast) {
        recordAttempt(allCorrectRef.current && isCorrect);
        return;
      }
      // Wrong answer ends the quiz immediately (matches original behaviour).
      if (!isCorrect) {
        recordAttempt(false);
        return;
      }
      setQuestionIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealedCorrectIndex(null);
    }, 900);
  };

  const handleClose = () => {
    window.clearInterval(timerRef.current);
    onClose();
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const current = questions[questionIndex];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-0 overflow-hidden">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/10 text-gray-600 backdrop-blur-sm hover:bg-black/20 active:scale-90 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="2" y1="2" x2="12" y2="12" />
            <line x1="12" y1="2" x2="2" y2="12" />
          </svg>
        </button>

        {/* Checking eligibility */}
        {phase === "checking" && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#D97706]" strokeWidth={2.2} />
            <p className="mt-3 text-[13px] font-medium text-gray-600">Checking your quiz…</p>
          </div>
        )}

        {/* Already played today */}
        {phase === "ineligible" && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FEF3C7]">
              <Clock className="h-8 w-8 text-[#B45309]" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-[17px] font-bold text-gray-900">Already Played Today!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              You've already taken the quiz today. Come back tomorrow for another shot at the cashback.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-[14px] font-semibold text-white shadow-md active:scale-95"
            >
              Close
            </button>
          </div>
        )}

        {/* Language Selection Phase */}
        {phase === "language" && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FEF3C7]">
                <Globe className="h-4 w-4 text-[#D97706]" strokeWidth={2.4} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#D97706]">
                Janmashtami Quiz
              </span>
            </div>

            <p className="text-[15px] font-semibold text-gray-900 mb-1">
              Select your language
            </p>
            <p className="text-[12px] text-gray-500 mb-4">
              Choose a language to play the quiz in
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  disabled={loadingQuestions}
                  onClick={() => startQuiz(lang)}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left active:scale-[0.97] transition-all hover:border-[#D97706] hover:bg-[#FFFBEB] disabled:opacity-60"
                >
                  <span className="text-[18px]">{LANG_FLAGS[lang]}</span>
                  <span className="text-[13px] font-semibold text-gray-800">{LANG_LABELS[lang]}</span>
                </button>
              ))}
            </div>
            {loadingQuestions && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-medium text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D97706]" strokeWidth={2.5} />
                Loading questions…
              </div>
            )}
          </div>
        )}

        {/* Playing Phase */}
        {phase === "playing" && current && (
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#D97706]">
                Janmashtami Quiz · {LANG_FLAGS[selectedLang!]} {LANG_LABELS[selectedLang!]}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[12px] font-bold text-[#B45309]">
                <Clock className="h-[13px] w-[13px]" strokeWidth={2.4} />
                {mm}:{ss}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {questions.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i < questionIndex ? "bg-[#10B981]" : i === questionIndex ? "bg-[#D97706]" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <p className="mt-4 text-[15px] font-semibold leading-snug text-gray-900">
              {questionIndex + 1}. {current.question}
            </p>

            <div className="mt-4 space-y-2.5">
              {current.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const showFeedback = selectedOption !== null && revealedCorrectIndex !== null;
                const isCorrectOption = idx === revealedCorrectIndex;
                const stateClasses = !showFeedback
                  ? isSelected
                    ? "border-[#D97706] bg-[#FEF3C7] text-gray-900"
                    : "border-gray-200 bg-white text-gray-800 active:scale-[0.98]"
                  : isCorrectOption
                  ? "border-[#10B981] bg-[#ECFDF5] text-gray-900"
                  : isSelected
                  ? "border-[#EF4444] bg-[#FEF2F2] text-gray-900"
                  : "border-gray-200 bg-white text-gray-800 opacity-60";

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={selectedOption !== null}
                    onClick={() => handleSelect(idx)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors ${stateClasses}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Success Phase */}
        {phase === "success" && (
          <div
            className="relative flex flex-col items-center px-6 py-10 text-center"
            style={{
              backgroundImage: `url(${resultBackdrop})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <ConfettiParticles />
            <span
              className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-white/80 backdrop-blur-sm"
              style={{ animation: "pop-in 0.5s ease-out both" }}
            >
              <PartyPopper className="h-8 w-8 text-[#10B981]" strokeWidth={2} />
            </span>
            <h3
              className="relative z-10 mt-4 text-[17px] font-bold text-gray-900"
              style={{ animation: "fade-up 0.5s ease-out 0.15s both" }}
            >
              You won ₹{QUIZ_CASHBACK_REWARD} cashback!
            </h3>
            <p
              className="relative z-10 mt-2 text-[13px] leading-relaxed text-gray-700"
              style={{ animation: "fade-up 0.5s ease-out 0.3s both" }}
            >
              Please check the <span className="font-semibold text-[#7C3AED]">Rewards</span> section in your Profile page to claim it.
            </p>
            <button
              type="button"
              onClick={() => {
                handleClose();
                setLocation("/profile?tab=rewards");
              }}
              disabled={submitting}
              className="relative z-10 mt-4 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-2 text-[13px] font-semibold text-white shadow-md active:scale-95 disabled:opacity-70"
              style={{ animation: "fade-up 0.5s ease-out 0.45s both" }}
            >
              <Gift className="h-[15px] w-[15px]" strokeWidth={2.2} />
              Go to Rewards
            </button>
          </div>
        )}

        {/* Failed Phase */}
        {phase === "failed" && (
          <div
            className="relative flex flex-col items-center px-6 py-10 text-center"
            style={{
              backgroundImage: `url(${resultBackdrop})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <FallingPetals />
            <h3
              className="relative z-10 mt-4 text-[17px] font-bold text-gray-900"
              style={{ animation: "fade-up 0.5s ease-out 0.15s both" }}
            >
              Try Again Tomorrow!
            </h3>
            <p
              className="relative z-10 mt-2 text-[13px] leading-relaxed text-gray-700"
              style={{ animation: "fade-up 0.5s ease-out 0.3s both" }}
            >
              You got {correctCount} out of {questions.length} correct.
              <br />
              Come back tomorrow for another shot at the cashback.
            </p>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="relative z-10 mt-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-2 text-[13px] font-semibold text-white shadow-md active:scale-95 disabled:opacity-70"
              style={{ animation: "fade-up 0.5s ease-out 0.45s both" }}
            >
              Close
            </button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
