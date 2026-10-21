import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Clock, PartyPopper, Globe, Loader2, Gift } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  completeQuiz,
  getRewardStatus,
  gradeAnswer,
  QUIZ_SUPERCOIN_REWARD,
  startQuizSession,
  type QuizQuestion,
  type QuizRewardStatus,
} from "@/api/rewardApi";
import { LANG_LABELS, LANG_FLAGS, type QuizLang } from "@/data/quizQuestions";
import resultBackdrop from "@/assets/Dussehrasuccess.png";
import krishnasadBackdrop from "@/assets/Dussehrafailure.png";

type Phase = "language" | "starting" | "playing" | "success" | "failed" | "expired" | "error";
type Props = {
  open: boolean;
  onClose: () => void;
  rewardPublicId: string;
  quizStartExpiresAt: string;
};

const LANGUAGES: QuizLang[] = ["en", "hi", "mr", "te", "ta", "kn"];

function remainingSeconds(deadline: string | null): number {
  if (!deadline) return 0;
  return Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000));
}

function Countdown({ seconds }: { seconds: number }) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return <>{mm}:{ss}</>;
}

export default function JanmashtamiQuizModal({
  open,
  onClose,
  rewardPublicId,
  quizStartExpiresAt,
}: Props) {
  const { user } = useAuthContext();
  const [phase, setPhase] = useState<Phase>("language");
  const [selectedLang, setSelectedLang] = useState<QuizLang>("en");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(quizStartExpiresAt));
  const [rewardExpiresAt, setRewardExpiresAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const allCorrectRef = useRef(true);
  const answerBusyRef = useRef(false);
  const transitionTimerRef = useRef<number | null>(null);

  const clearTransitionTimer = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  const reset = useCallback(() => {
    clearTransitionTimer();
    setPhase("language");
    setSelectedLang("en");
    setQuestions([]);
    setQuestionIndex(0);
    setSelectedOption(null);
    setRevealedCorrectIndex(null);
    setSecondsLeft(remainingSeconds(quizStartExpiresAt));
    setRewardExpiresAt(null);
    setSubmitting(false);
    setCorrectCount(0);
    setAttemptsRemaining(null);
    allCorrectRef.current = true;
    answerBusyRef.current = false;
  }, [quizStartExpiresAt]);

  useEffect(() => {
    if (open) reset();
    else clearTransitionTimer();
  }, [open, reset]);

  const deadline = phase === "success" ? rewardExpiresAt : quizStartExpiresAt;
  useEffect(() => {
    if (!open || !["language", "starting", "playing", "success"].includes(phase)) return;
    const tick = () => {
      const remaining = remainingSeconds(deadline);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        if (phase === "success") setPhase("expired");
        else if (phase !== "starting") setPhase("expired");
      }
    };
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [open, phase, deadline]);

  // Show how many tries are left today on the lost / timed-out screens.
  useEffect(() => {
    if (!open || !user?.clientId) return;
    if ((phase !== "failed" && phase !== "expired") || attemptsRemaining !== null) return;
    let active = true;
    getRewardStatus(user.clientId, rewardPublicId)
      .then((status) => {
        if (active && typeof status.attemptsRemaining === "number") setAttemptsRemaining(status.attemptsRemaining);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [open, phase, attemptsRemaining, user?.clientId, rewardPublicId]);

  const triesLine =
    attemptsRemaining === null
      ? null
      : attemptsRemaining > 0
        ? `You have ${attemptsRemaining} ${attemptsRemaining === 1 ? "try" : "tries"} left today.`
        : "You have used all your tries for today. Come back tomorrow for more.";

  const startQuiz = async (lang: QuizLang) => {
    if (!user?.clientId || !rewardPublicId) {
      setPhase("error");
      return;
    }
    if (remainingSeconds(quizStartExpiresAt) <= 0) {
      setPhase("expired");
      return;
    }
    setSelectedLang(lang);
    setSubmitting(true);
    setPhase("starting");
    try {
      const started = await startQuizSession(user.clientId, rewardPublicId, lang);
      if (started.reward.status === "EXPIRED" || !started.questions.length) {
        setPhase("expired");
        return;
      }
      if (typeof started.reward.attemptsRemaining === "number") setAttemptsRemaining(started.reward.attemptsRemaining);
      setQuestions(started.questions);
      setQuestionIndex(0);
      setSelectedOption(null);
      setSecondsLeft(remainingSeconds(started.reward.quizStartExpiresAt));
      setPhase("playing");
    } catch (error: any) {
      setPhase(error?.response?.status === 410 ? "expired" : "error");
    } finally {
      setSubmitting(false);
    }
  };

  const finishQuiz = async () => {
    if (!user?.clientId) {
      setPhase("error");
      return;
    }
    setSubmitting(true);
    try {
      const result: QuizRewardStatus = await completeQuiz(user.clientId, rewardPublicId);
      if (typeof result.attemptsRemaining === "number") setAttemptsRemaining(result.attemptsRemaining);
      if (result.status === "PENDING" && result.expiresAt) {
        setRewardExpiresAt(result.expiresAt);
        setSecondsLeft(remainingSeconds(result.expiresAt));
        setPhase("success");
      } else if (result.status === "EXPIRED") {
        setPhase("expired");
      } else {
        setPhase("failed");
      }
    } catch (error: any) {
      setPhase(error?.response?.status === 410 ? "expired" : "failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelect = async (optionIndex: number) => {
    if (phase !== "playing" || selectedOption !== null || answerBusyRef.current) return;
    const question = questions[questionIndex];
    if (!question || !user?.clientId) return;
    answerBusyRef.current = true;
    setSelectedOption(optionIndex);

    try {
      const result = await gradeAnswer(user.clientId, rewardPublicId, question.id, optionIndex);
      setRevealedCorrectIndex(result.correctIndex);
      if (result.correct) setCorrectCount((count) => count + 1);
      else allCorrectRef.current = false;
    } catch (error: any) {
      if (error?.response?.status === 410) {
        setPhase("expired");
        answerBusyRef.current = false;
        return;
      }
      allCorrectRef.current = false;
      setRevealedCorrectIndex(null);
    }

    const lastQuestion = questionIndex === questions.length - 1;
    transitionTimerRef.current = window.setTimeout(() => {
      answerBusyRef.current = false;
      if (lastQuestion) {
        void finishQuiz();
      } else {
        setQuestionIndex((index) => index + 1);
        setSelectedOption(null);
        setRevealedCorrectIndex(null);
      }
    }, 700);
  };

  const current = questions[questionIndex];
  const languages = useMemo(() => LANGUAGES, []);
  const close = () => {
    clearTransitionTimer();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && close()}>
      <DialogContent className="w-[92vw] max-w-sm overflow-hidden rounded-2xl p-0">
        <button
          type="button"
          onClick={close}
          aria-label="Close quiz"
          className="absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/10 text-gray-600"
        >
          ×
        </button>

        {phase === "language" && (
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#D97706]">Dussehra Quiz</span>
              <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[12px] font-bold text-[#B45309]">
                <Clock className="h-3.5 w-3.5" /> <Countdown seconds={secondsLeft} />
              </span>
            </div>
            <h3 className="mt-4 text-[16px] font-bold text-gray-900">Choose a language</h3>
            <p className="mt-1 text-[12px] text-gray-600">Start and answer every question correctly within the two-minute window.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  disabled={submitting || secondsLeft === 0}
                  onClick={() => void startQuiz(lang)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left text-[13px] font-semibold text-gray-800 hover:border-[#D97706] disabled:opacity-60"
                >
                  <span className="text-lg">{LANG_FLAGS[lang]}</span>{LANG_LABELS[lang]}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "starting" && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#D97706]" />
            <p className="mt-3 text-[13px] font-medium text-gray-600">Starting your quiz…</p>
          </div>
        )}

        {phase === "playing" && current && (
          <div className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wide text-[#D97706]">
                Dussehra · {LANG_FLAGS[selectedLang]} {LANG_LABELS[selectedLang]}
              </span>
              <span className="flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[12px] font-bold text-[#B45309]">
                <Clock className="h-3.5 w-3.5" /> <Countdown seconds={secondsLeft} />
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {questions.map((_, index) => (
                <span key={index} className={`h-1.5 flex-1 rounded-full ${index < questionIndex ? "bg-[#10B981]" : index === questionIndex ? "bg-[#D97706]" : "bg-gray-200"}`} />
              ))}
            </div>
            <p className="mt-4 text-[15px] font-semibold leading-snug text-gray-900">
              {questionIndex + 1}. {current.question}
            </p>
            <div className="mt-4 space-y-2.5">
              {current.options.map((option, index) => {
                const selected = selectedOption === index;
                const correct = revealedCorrectIndex === index;
                const feedback = selectedOption !== null && revealedCorrectIndex !== null;
                const color = !feedback ? (selected ? "border-[#D97706] bg-[#FEF3C7]" : "border-gray-200 bg-white")
                  : correct ? "border-[#10B981] bg-[#ECFDF5]" : selected ? "border-[#EF4444] bg-[#FEF2F2]" : "border-gray-200 bg-white opacity-60";
                return (
                  <button key={index} type="button" disabled={selectedOption !== null}
                    onClick={() => void handleSelect(index)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-800 ${color}`}>
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "success" && (
          <div className="relative flex flex-col items-center px-6 py-9 text-center" style={{ backgroundImage: `url(${resultBackdrop})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <PartyPopper className="h-12 w-12 text-[#10B981]" />
            <h3 className="mt-3 text-[17px] font-bold text-gray-900">Happy Dussehra! You won the quiz.</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-700">Earn {QUIZ_SUPERCOIN_REWARD} bonus SuperCoins — complete a new purchase before the timer runs out. The bonus is added automatically after payment and voucher fulfillment.</p>
            <p className="mt-3 flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-[#7C3AED]">
              <Clock className="h-3.5 w-3.5" /> Expires in <Countdown seconds={secondsLeft} />
            </p>
            <button type="button" onClick={close} className="mt-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-2 text-[13px] font-semibold text-white">
              Continue
            </button>
          </div>
        )}

        {phase === "failed" && (
          <div className="relative flex flex-col items-center px-6 py-9 text-center" style={{ backgroundImage: `url(${krishnasadBackdrop})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <h3 className="mt-2 text-[17px] font-bold text-gray-900">Better luck this Dussehra!</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-700">You got {correctCount} of {questions.length} correct. All answers must be correct to earn the {QUIZ_SUPERCOIN_REWARD} SuperCoins.</p>
            {triesLine && <p className="mt-2 text-[13px] font-semibold text-[#7C3AED]">{triesLine}</p>}
            <button type="button" onClick={close} className="mt-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-2 text-[13px] font-semibold text-white">Close</button>
          </div>
        )}

        {phase === "expired" && (
          <div className="flex flex-col items-center px-6 py-9 text-center">
            <Clock className="h-10 w-10 text-[#B45309]" />
            <h3 className="mt-3 text-[17px] font-bold text-gray-900">Quiz window expired</h3>
            <p className="mt-2 text-[13px] text-gray-600">Time is up. Each quiz must be finished within two minutes, and a bonus must be used before its timer runs out.</p>
            {triesLine && <p className="mt-2 text-[13px] font-semibold text-[#7C3AED]">{triesLine}</p>}
            <button type="button" onClick={close} className="mt-5 rounded-lg bg-gray-900 px-8 py-2 text-[13px] font-semibold text-white">Close</button>
          </div>
        )}

        {phase === "error" && (
          <div className="flex flex-col items-center px-6 py-9 text-center">
            <Gift className="h-10 w-10 text-[#7C3AED]" />
            <h3 className="mt-3 text-[17px] font-bold text-gray-900">Quiz unavailable</h3>
            <p className="mt-2 text-[13px] text-gray-600">We couldn’t start this quiz right now. Please close this and try again.</p>
            <button type="button" onClick={close} className="mt-5 rounded-lg bg-gray-900 px-8 py-2 text-[13px] font-semibold text-white">Close</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
