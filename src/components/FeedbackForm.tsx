import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, CheckCircle, Mail, Heart, Loader2, Zap,
  MousePointerClick, CreditCard, Star, Lightbulb, ThumbsUp,
  MapPin, User, Briefcase,
} from "lucide-react";
import { submitFeedback } from "@/api/feedbackApi";
import { useAuthContext } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

const FEEDBACK_KEY = "gift360_feedback_submitted";
const FEEDBACK_PROMPTED_KEY = "gift360_feedback_auto_prompted";

export function hasSubmittedFeedback(): boolean {
  return localStorage.getItem(FEEDBACK_KEY) === "true";
}

export function markFeedbackSubmitted() {
  localStorage.setItem(FEEDBACK_KEY, "true");
}

// Tracks whether the auto-prompt has ever been shown, separate from whether
// feedback was actually submitted -- it must fire at most once ever, even if
// the user dismisses it without submitting (they can still reach the form
// manually afterwards via the header icon).
export function hasBeenPromptedForFeedback(): boolean {
  return localStorage.getItem(FEEDBACK_PROMPTED_KEY) === "true";
}

export function markFeedbackPrompted() {
  localStorage.setItem(FEEDBACK_PROMPTED_KEY, "true");
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called once the backend accepts a submission (used by the orchestrator to stop re-prompting). */
  onSubmitted?: () => void;
};

const GRAPE = "from-[#9747FF] to-[#7C3AED]";
const GRAPE_HOVER = "hover:from-[#8A3BFF] hover:to-[#6D28D9]";

const pillClass = (selected: boolean) =>
  `w-full rounded-full py-2.5 text-sm font-semibold transition-all border-2 ${
    selected
      ? `bg-gradient-to-r ${GRAPE} text-white border-transparent shadow-md`
      : "bg-white text-gray-700 border-gray-200 hover:border-[#C9A6FF] hover:bg-[#FAF6FF]"
  }`;

export default function FeedbackForm({ open, onClose, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Envelope consent step first: "Help us with feedback?" Yes -> questions.
  const [step, setStep] = useState<"consent" | "form">("consent");
  const [closing, setClosing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const { user } = useAuthContext();

  useEffect(() => {
    if (open) {
      setAnswers({});
      setError(null);
      setSubmitted(false);
      setStep("consent");
      setClosing(false);
      closingRef.current = false;
    }
  }, [open]);

  // Prevent the page behind the modal from scrolling.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = () => {
    setAnswers({});
    setLoading(false);
    setError(null);
    setSubmitted(false);
    setStep("consent");
    onClose();
  };

  // Dismiss with a gentle fade-out before unmounting (X, No, Escape).
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(() => {
      closingRef.current = false;
      setClosing(false);
      handleClose();
    }, 150);
  }, []);

  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  // Escape closes whichever step is visible.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Keep focus inside the dialog when it opens or the step changes.
  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, step]);

  const setAnswer = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitFeedback({
        speed: answers.speed,
        usability: answers.usability,
        payment: answers.payment,
        overall: answers.overall,
        nps: answers.nps,
        locationShare: answers.locationShare,
        userLocation: answers.userLocation,
        gender: answers.gender,
        occupation: answers.occupation,
        brandBought: answers.brandBought,
        hasSuggestion: answers.hasSuggestion,
        suggestion: answers.suggestion,
        clientId: user?.clientId,
      });
      markFeedbackSubmitted();
      onSubmitted?.();
      // GA4 feedback_submitted -- fires on genuine submission success, with
      // the overall/NPS scores as parameters so low scores can be
      // correlated against what page/step the customer was on.
      trackEvent("feedback_submitted", {
        overall: answers.overall,
        nps: answers.nps,
        has_suggestion: answers.hasSuggestion,
      });
      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2200);
    } catch (err: any) {
      setError(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const requiredFields = ["speed", "usability", "payment", "overall", "nps", "locationShare", "gender"];
  if (answers.locationShare === "yes") requiredFields.push("userLocation");
  const allAnswered = requiredFields.every((id) => answers[id] !== undefined && answers[id] !== "");

  const animIn = "animate-in fade-in zoom-in-95 duration-200";
  const animOut = "animate-out fade-out zoom-out-95 duration-150";
  const overlayAnim = closing
    ? "animate-out fade-out duration-150"
    : "animate-in fade-in duration-200";

  // ── Step 1: envelope consent ──────────────────────────────────────────
  if (step === "consent") {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${overlayAnim}`}
      >
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fb-consent-title"
          aria-describedby="fb-consent-desc"
          tabIndex={-1}
          className={`relative w-full max-w-[420px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(23,15,60,0.28)] outline-none ${closing ? animOut : animIn}`}
        >
          {/* Envelope flap */}
          <div className={`relative h-24 bg-gradient-to-br ${GRAPE}`}>
            <div
              className="pointer-events-none absolute inset-0 bg-white/12"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
            <button
              onClick={requestClose}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/90 hover:bg-white/20 transition-colors"
              aria-label="Close feedback prompt"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 pb-7 text-center">
            {/* Envelope + heart icon */}
            <div className="-mt-8 flex justify-center">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${GRAPE} shadow-lg shadow-purple-300/60`}>
                <div className="relative">
                  <Mail className="h-7 w-7 text-white" strokeWidth={2} />
                  <Heart className="absolute -bottom-2 -right-2 h-4 w-4 fill-[#FF7AB8] text-[#FF7AB8]" />
                </div>
              </div>
            </div>

            <h2 id="fb-consent-title" className="mt-3 text-xl font-bold text-gray-900">
              Help us with feedback
            </h2>
            <p id="fb-consent-desc" className="mt-1.5 text-sm text-gray-500 leading-relaxed">
              Your feedback helps us make Gift360 better for you.
            </p>

            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => setStep("form")}
                className={`w-full rounded-full bg-gradient-to-r ${GRAPE} ${GRAPE_HOVER} px-6 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg active:scale-[0.98] transition-all`}
              >
                Yes, share feedback
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="w-full rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
              >
                No, thanks
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: feedback questions ────────────────────────────────────────
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${overlayAnim}`}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-form-title"
        tabIndex={-1}
        className={`relative w-full max-w-[500px] max-h-[88vh] bg-white rounded-3xl shadow-[0_24px_60px_rgba(23,15,60,0.28)] overflow-hidden flex flex-col outline-none ${closing ? animOut : animIn}`}
      >
        {/* Header — envelope flap crease */}
        <div className={`relative bg-gradient-to-br ${GRAPE} px-5 pt-5 pb-6 text-white flex-shrink-0`}>
          <div
            className="pointer-events-none absolute inset-0 bg-white/10"
            style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
          />
          <button
            onClick={requestClose}
            className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/90 hover:bg-white/20 transition-colors"
            aria-label="Close feedback form"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-3 pr-10">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Mail className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 id="fb-form-title" className="text-lg font-bold leading-tight">
                We&rsquo;d love to hear from you!
              </h2>
              <p className="text-[13px] text-white/85 mt-0.5">
                Your feedback helps us make Gift360 better for you.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Thank you for your feedback!</h3>
                <p className="text-sm text-gray-600">Your input helps us make Gift360 better for everyone.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Q1: Location sharing */}
              <QuestionBlock icon={MapPin} label="Would you like to share your location so we can recommend offers available near you?">
                <div className="flex gap-2">
                  {[
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("locationShare", opt.value)}
                      className={pillClass(answers.locationShare === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {answers.locationShare === "yes" && (
                  <div className="mt-3 pl-[42px] animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={answers.userLocation || ""}
                      onChange={(e) => setAnswer("userLocation", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9747FF] focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Enter your city or area"
                    />
                  </div>
                )}
              </QuestionBlock>

              {/* Q2: Gender */}
              <QuestionBlock icon={User} label="You are">
                <div className="flex gap-2">
                  {[
                    { label: "Male", value: "male" },
                    { label: "Female", value: "female" },
                    { label: "Other", value: "other" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("gender", opt.value)}
                      className={pillClass(answers.gender === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q3: Speed */}
              <QuestionBlock icon={Zap} label="How fast does the app feel?">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Slow", value: 1 },
                    { label: "Okay", value: 2 },
                    { label: "Good", value: 3 },
                    { label: "Fast", value: 4 },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("speed", opt.value)}
                      className={pillClass(answers.speed === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q4: Usability */}
              <QuestionBlock icon={MousePointerClick} label="How easy is it to find and buy a voucher?">
                <div className="flex gap-2">
                  {["Hard", "Neutral", "Easy"].map((opt) => {
                    const val = opt.toLowerCase();
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswer("usability", val)}
                        className={pillClass(answers.usability === val)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </QuestionBlock>

              {/* Q5: Payment */}
              <QuestionBlock icon={CreditCard} label="How was the payment experience?">
                <div className="flex gap-2">
                  {[
                    { label: "Had issues", value: "issues" },
                    { label: "Okay", value: "okay" },
                    { label: "Smooth", value: "smooth" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("payment", opt.value)}
                      className={pillClass(answers.payment === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q6: Overall rating */}
              <QuestionBlock icon={Star} label="Overall, how would you rate your experience?">
                <div className="flex gap-2 py-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    const filled = (answers.overall || 0) >= starVal;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAnswer("overall", starVal)}
                        className="text-3xl transition-transform active:scale-110"
                        aria-label={`Rate ${starVal} star${starVal > 1 ? "s" : ""}`}
                      >
                        <span className={filled ? "text-amber-400" : "text-gray-300"}>★</span>
                      </button>
                    );
                  })}
                </div>
              </QuestionBlock>

              {/* Q7: NPS */}
              <QuestionBlock icon={ThumbsUp} label="How likely are you to recommend Gift360 to a friend?">
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAnswer("nps", i)}
                      className={`w-[34px] h-[34px] rounded-lg text-xs font-semibold transition-all border-2 ${
                        answers.nps === i
                          ? i <= 6
                            ? "bg-red-100 border-red-400 text-red-700"
                            : i <= 8
                              ? "bg-amber-100 border-amber-400 text-amber-700"
                              : "bg-green-100 border-green-400 text-green-700"
                          : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A6FF]"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-1 px-0.5">
                  <span className="text-[9px] text-gray-400">Not likely</span>
                  <span className="text-[9px] text-gray-400">Very likely</span>
                </div>
              </QuestionBlock>

              {/* Q8: Occupation */}
              <QuestionBlock icon={Briefcase} label="What best describes you?" optional>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Working Professional", value: "working_professional" },
                    { label: "Student", value: "student" },
                    { label: "Business Owner", value: "business_owner" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("occupation", opt.value)}
                      className={`flex-1 rounded-full py-2.5 px-3 text-sm font-semibold transition-all border-2 ${
                        answers.occupation === opt.value
                          ? `bg-gradient-to-r ${GRAPE} text-white border-transparent shadow-md`
                          : "bg-white text-gray-700 border-gray-200 hover:border-[#C9A6FF] hover:bg-[#FAF6FF]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q9: Suggestions */}
              <QuestionBlock icon={Lightbulb} label="Any suggestions to make the app better?" optional>
                <div className="flex gap-2">
                  {[
                    { label: "No", value: "no" },
                    { label: "Not sure", value: "not_sure" },
                    { label: "Yes", value: "yes" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("hasSuggestion", opt.value)}
                      className={pillClass(answers.hasSuggestion === opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {answers.hasSuggestion === "yes" && (
                  <div className="animate-in fade-in duration-200">
                    <textarea
                      value={answers.suggestion || ""}
                      onChange={(e) => setAnswer("suggestion", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9747FF] focus:border-transparent outline-none transition-all resize-none text-sm"
                      placeholder="Share your suggestions..."
                    />
                  </div>
                )}
              </QuestionBlock>
            </>
          )}
        </div>

        {/* Fixed Footer */}
        {!submitted && (
          <div className="flex-shrink-0 p-4 border-t border-purple-100">
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className={`w-full px-6 py-3 bg-gradient-to-r ${GRAPE} ${GRAPE_HOVER} text-white rounded-full font-semibold transition-all shadow-md hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({
  icon: Icon,
  label,
  optional,
  children,
}: {
  icon: any;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#F1E7FF]">
          <Icon className="h-4 w-4 text-[#9747FF]" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 leading-snug">
          {label}
          {optional && <span className="ml-1 text-[10px] font-normal text-gray-400">(optional)</span>}
        </h3>
      </div>
      {children}
    </div>
  );
}
