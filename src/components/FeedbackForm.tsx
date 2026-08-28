import { useState, useEffect } from "react";
import { X, CheckCircle, MessageSquare, Loader2, Zap, MousePointerClick, CreditCard, Star, Lightbulb, ThumbsUp, HelpCircle } from "lucide-react";
import { submitFeedback } from "@/api/feedbackApi";
import { useAuthContext } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

const FEEDBACK_KEY = "gift360_feedback_submitted";

export function hasSubmittedFeedback(): boolean {
  return localStorage.getItem(FEEDBACK_KEY) === "true";
}

export function markFeedbackSubmitted() {
  localStorage.setItem(FEEDBACK_KEY, "true");
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function FeedbackForm({ open, onClose }: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  useEffect(() => {
    if (open) {
      setAnswers({});
      setError(null);
    }
  }, [open]);

  if (!open) return null;

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

  const handleClose = () => {
    setAnswers({});
    setLoading(false);
    setError(null);
    onClose();
  };

  const requiredFields = ["speed", "usability", "payment", "overall", "nps", "locationShare", "gender"];
  if (answers.locationShare === "yes") requiredFields.push("userLocation");
  const allAnswered = requiredFields.every((id) => answers[id] !== undefined && answers[id] !== "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-xl shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-t-xl p-5 text-white flex-shrink-0">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold mb-1">We value your feedback</h2>
          <p className="text-sm text-purple-100">Help us improve your Gift360 experience</p>
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
              <QuestionBlock icon={HelpCircle} label="Would you like to share your location so we can recommend offers available near you?">
                <div className="flex gap-2">
                  {[
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("locationShare", opt.value)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.locationShare === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Enter your city or area"
                    />
                  </div>
                )}
              </QuestionBlock>

              {/* Q2: Gender */}
              <QuestionBlock icon={HelpCircle} label="You are">
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
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.gender === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
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
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.speed === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q2: Usability */}
              <QuestionBlock icon={MousePointerClick} label="How easy is it to find and buy a voucher?">
                <div className="flex gap-2">
                  {["Hard", "Neutral", "Easy"].map((opt) => {
                    const val = opt.toLowerCase();
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAnswer("usability", val)}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                          answers.usability === val
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                            : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </QuestionBlock>

              {/* Q3: Payment */}
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
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.payment === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q4: Overall rating */}
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
                      >
                        <span className={filled ? "text-amber-400" : "text-gray-300"}>★</span>
                      </button>
                    );
                  })}
                </div>
              </QuestionBlock>

              {/* Q5: NPS */}
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
                          : "bg-white border-gray-200 text-gray-600 hover:border-purple-300"
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

              {/* Q9: Occupation */}
              <QuestionBlock icon={HelpCircle} label="What best describes you?" optional>
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
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.occupation === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionBlock>

              {/* Q8: Suggestions */}
              <QuestionBlock icon={Lightbulb} label="Any suggestions to make the app better?" optional>
                <div className="flex gap-2 pl-[42px]">
                  {[
                    { label: "No", value: "no" },
                    { label: "Not sure", value: "not_sure" },
                    { label: "Yes", value: "yes" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer("hasSuggestion", opt.value)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border-2 ${
                        answers.hasSuggestion === opt.value
                          ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md"
                          : "bg-white text-gray-700 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {answers.hasSuggestion === "yes" && (
                  <div className="pl-[42px] animate-in fade-in duration-200">
                    <textarea
                      value={answers.suggestion || ""}
                      onChange={(e) => setAnswer("suggestion", e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none text-sm"
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
          <div className="flex-shrink-0 p-4 border-t border-gray-100">
            {error && (
              <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
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
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
          <Icon className="h-4 w-4 text-purple-600" />
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
