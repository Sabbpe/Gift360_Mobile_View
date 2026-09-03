import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, Frown, PartyPopper, Gift, Globe } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { recordQuizAttempt } from "@/api/rewardApi";
import { getRandomQuestions, LANG_LABELS, LANG_FLAGS, type QuizLang, type QuizQuestion } from "@/data/quizQuestions";

const QUIZ_DURATION_MS = 60_000;

type Phase = "language" | "playing" | "success" | "failed" | "timeout";

type Props = {
  open: boolean;
  onClose: () => void;
};

const LANGUAGES: QuizLang[] = ["en", "hi", "mr", "te", "ta", "kn"];

export default function JanmashtamiQuizModal({ open, onClose }: Props) {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("language");
  const [selectedLang, setSelectedLang] = useState<QuizLang | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const endAtRef = useRef<number>(0);
  const timerRef = useRef<number>(0);

  const resetQuiz = useCallback(() => {
    setPhase("language");
    setSelectedLang(null);
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedOption(null);
    setSecondsLeft(60);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetQuiz();
  }, [open, resetQuiz]);

  const startQuiz = useCallback((lang: QuizLang) => {
    const picked = getRandomQuestions(lang, 5);
    setQuestions(picked);
    setSelectedLang(lang);
    setPhase("playing");
    setQuestionIndex(0);
    setSelectedOption(null);
    setSecondsLeft(60);
    endAtRef.current = Date.now() + QUIZ_DURATION_MS;
  }, []);

  const finishAttempt = useCallback(
    async (won: boolean, resultPhase: "success" | "failed" | "timeout") => {
      if (!user?.clientId) {
        setPhase(resultPhase);
        return;
      }
      setSubmitting(true);
      try {
        await recordQuizAttempt(user.clientId, won);
      } catch {
        // idempotent server-side
      } finally {
        setSubmitting(false);
        setPhase(resultPhase);
        queryClient.invalidateQueries({ queryKey: ["rewardStatus", user.clientId] });
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
        finishAttempt(false, "timeout");
      }
    }, 250);

    return () => window.clearInterval(timerRef.current);
  }, [open, phase, finishAttempt]);

  const handleSelect = (optionIdx: number) => {
    if (phase !== "playing" || selectedOption !== null) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === questions[questionIndex].correctIndex;
    window.setTimeout(() => {
      if (!isCorrect) {
        finishAttempt(false, "failed");
        return;
      }
      if (questionIndex === questions.length - 1) {
        finishAttempt(true, "success");
        return;
      }
      setQuestionIndex((i) => i + 1);
      setSelectedOption(null);
    }, 450);
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
                  onClick={() => startQuiz(lang)}
                  className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-left active:scale-[0.97] transition-all hover:border-[#D97706] hover:bg-[#FFFBEB]"
                >
                  <span className="text-[18px]">{LANG_FLAGS[lang]}</span>
                  <span className="text-[13px] font-semibold text-gray-800">{LANG_LABELS[lang]}</span>
                </button>
              ))}
            </div>
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
                const isCorrectOption = idx === current.correctIndex;
                const showFeedback = selectedOption !== null;
                const stateClasses = !showFeedback
                  ? "border-gray-200 bg-white active:scale-[0.98]"
                  : isSelected && isCorrectOption
                  ? "border-[#10B981] bg-[#ECFDF5]"
                  : isSelected
                  ? "border-[#EF4444] bg-[#FEF2F2]"
                  : "border-gray-200 bg-white opacity-60";

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={showFeedback}
                    onClick={() => handleSelect(idx)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-800 transition-colors ${stateClasses}`}
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
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#ECFDF5]">
              <PartyPopper className="h-8 w-8 text-[#10B981]" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-[17px] font-bold text-gray-900">You won ₹10 cashback!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              Please check the <span className="font-semibold text-[#7C3AED]">Rewards</span> section in your Profile page to claim it.
            </p>
            <button
              type="button"
              onClick={() => {
                handleClose();
                setLocation("/profile?tab=rewards");
              }}
              disabled={submitting}
              className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-[14px] font-semibold text-white shadow-md active:scale-95 disabled:opacity-70"
            >
              <Gift className="h-[15px] w-[15px]" strokeWidth={2.2} />
              Go to Rewards
            </button>
          </div>
        )}

        {/* Failed / Timeout Phase */}
        {(phase === "failed" || phase === "timeout") && (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-[#FEF3C7]">
              <Frown className="h-8 w-8 text-[#B45309]" strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-[17px] font-bold text-gray-900">Try Again Tomorrow!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {phase === "timeout"
                ? "You ran out of time before finishing all 5 questions."
                : "Not all 5 answers were correct."}
              <br />
              Come back in 24 hours for another shot at the cashback.
            </p>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-[14px] font-semibold text-white shadow-md active:scale-95 disabled:opacity-70"
            >
              Close
            </button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
