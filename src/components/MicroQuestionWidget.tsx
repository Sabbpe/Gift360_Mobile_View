import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MessageSquareHeart, X } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAnsweredMicroFeedback, submitMicroFeedback } from "@/api/microFeedbackApi";
import { trackEvent } from "@/lib/analytics";
import RewardsModal from "@/components/RewardsModal";

type MicroQuestion = {
  key: string;
  pages: string[];
  text: string;
  /** Yes opens the Rewards (quiz) modal. */
  reward?: boolean;
  /** Yes navigates to this route. */
  href?: string;
};

/** The contextual Yes/No questions, segregated by page. */
const MICRO_QUESTIONS: MicroQuestion[] = [
  { key: "home_nearby_offers", pages: ["home"], text: "Are nearby offers useful to you?" },
  { key: "home_more_cities", pages: ["home"], text: "Want offers in more cities?" },
  {
    key: "home_corporate",
    pages: ["home"],
    text: "Interested in corporate bulk gifting?",
    href: "/distributor",
  },
  { key: "brands_more", pages: ["brands"], text: "Looking for more brands?" },
  { key: "brands_office", pages: ["brands"], text: "Are you looking for office-related vouchers?" },
  { key: "cart_discount", pages: ["cart"], text: "Looking for more discount?" },
  {
    key: "purchase_supercoin",
    pages: ["cart", "brands"],
    text: "Want to make a purchase and get a chance to earn SuperCoins?",
    reward: true,
  },
  {
    key: "cart_supercoin_plan",
    pages: ["cart"],
    text: "Planning to use SuperCoins soon?",
    reward: true,
  },
  { key: "orders_redeem", pages: ["orders"], text: "Ready to redeem your voucher?" },
  { key: "orders_help", pages: ["orders"], text: "Need help with an order?" },
  { key: "profile_happy", pages: ["profile"], text: "Happy with your Gift360 experience so far?" },
];

const BLOCKED_PATHS = [
  "/admin", "/onboarding", "/login", "/register",
  "/forgot-password", "/reset-password",
];

function pageForPath(path: string): string | null {
  if (path === "/" || path === "/home") return "home";
  if (path.startsWith("/brands") || path.startsWith("/categories")) return "brands";
  if (path.startsWith("/cart")) return "cart";
  if (path.startsWith("/orders") || path.startsWith("/my-orders")) return "orders";
  if (path.startsWith("/profile")) return "profile";
  return null;
}

const SHOW_MS = 15_000;
const HIDE_MS = 20_000;
const FIRST_DELAY_MS = 4_000;

/**
 * Collapsible right-edge micro-feedback widget.
 * Cycles small Yes/No questions for the current page (15s shown, ~20s gap),
 * stores answers in the backend, and never blocks the user's journey.
 * "Yes" on the SuperCoin question opens the Rewards modal.
 */
export default function MicroQuestionWidget() {
  const { user } = useAuthContext();
  const [location, setLocation] = useLocation();
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<MicroQuestion | null>(null);
  const [visible, setVisible] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [resumeTick, setResumeTick] = useState(0);

  const idxRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  const blocked = BLOCKED_PATHS.some((p) => location === p || location.startsWith(p + "/"));
  const page = pageForPath(location);

  // Fetch already-answered keys so we never re-ask them.
  useEffect(() => {
    setAnswered(new Set());
    if (!user?.clientId) return;
    getAnsweredMicroFeedback(user.clientId)
      .then((res) => setAnswered(new Set(res.keys ?? [])))
      .catch(() => { /* offline: just cycle everything locally */ });
  }, [user?.clientId]);

  // Unanswered questions for the current page.
  const pool = useMemo(() => {
    if (!page) return [];
    return MICRO_QUESTIONS.filter((q) => q.pages.includes(page) && !answered.has(q.key));
  }, [page, answered]);
  const poolKey = pool.map((q) => q.key).join(",");

  // Auto-cycle: show first question, 15s shown -> ~20s gap -> next, forever.
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(false);
    setQuestion(null);
    if (!user?.clientId || blocked || pool.length === 0) return;
    let alive = true;
    const run = (delay: number, fn: () => void) => {
      timerRef.current = window.setTimeout(() => {
        if (!alive) return;
        fn();
      }, delay);
    };
    const hidePhase = () => {
      setVisible(false);
      setQuestion(null);
      run(HIDE_MS, showPhase);
    };
    const showPhase = () => {
      const q = pool[idxRef.current % pool.length];
      idxRef.current += 1;
      setThanks(false);
      setQuestion(q);
      setVisible(true);
      run(SHOW_MS, hidePhase);
    };
    run(FIRST_DELAY_MS, showPhase);
    return () => {
      alive = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [user?.clientId, blocked, poolKey, resumeTick]);

  const collapse = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setVisible(false);
    setQuestion(null);
    setThanks(false);
    setResumeTick((t) => t + 1);
  };

  const expand = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const q = pool[idxRef.current % pool.length];
    if (!q) return;
    idxRef.current += 1;
    setThanks(false);
    setQuestion(q);
    setVisible(true);
  };

  const answer = async (val: "yes" | "no") => {
    if (!question || !user?.clientId) return;
    const q = question;
    setAnswered((prev) => new Set([...prev, q.key]));
    trackEvent("micro_feedback_answered", {
      question_key: q.key,
      answer: val,
      page: q.pages[0],
    });
    try {
      await submitMicroFeedback({
        clientId: user.clientId,
        questionKey: q.key,
        page: q.pages[0],
        answer: val,
      });
    } catch {
      /* non-blocking: the widget is best-effort */
    }
    if (q.reward && val === "yes") setRewardsOpen(true);
    setThanks(true);
    if (q.href && val === "yes") {
      window.setTimeout(() => setLocation(q.href!), 700);
    }
    window.setTimeout(collapse, 900);
  };

  if (!user?.clientId || blocked || pool.length === 0) {
    return rewardsOpen ? <RewardsModal open={rewardsOpen} onClose={() => setRewardsOpen(false)} /> : null;
  }

  return (
    <>
      {/* Collapsed pill on the right edge — tiny icon-only */}
      {!visible && (
        <button
          type="button"
          onClick={expand}
          className="fixed right-1.5 top-[32%] z-40 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9747FF] to-[#7C3AED] text-white shadow-[0_6px_16px_rgba(151,71,255,0.35)] active:scale-95 transition-transform"
          aria-label="Open a quick feedback question"
        >
          <MessageSquareHeart className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}

      {/* Expanded question card — intentionally tiny so it never blocks the page */}
      {visible && question && (
        <div
          role="region"
          aria-label="Quick feedback question"
          className="fixed right-1.5 top-[32%] z-40 w-[172px] overflow-hidden rounded-xl border border-purple-100 bg-white shadow-[0_8px_24px_rgba(23,15,60,0.14)] animate-in fade-in slide-in-from-right-3 duration-200"
        >
          <div className="flex items-start gap-1 px-2.5 pt-2">
            <p className="flex-1 text-[11px] font-semibold leading-snug text-gray-800">
              {thanks ? "Thanks!" : question.text}
            </p>
            {!thanks && (
              <button
                type="button"
                onClick={collapse}
                className="-mr-0.5 -mt-0.5 rounded-full p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors"
                aria-label="Close question"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {!thanks && (
            <div className="flex gap-1 px-2.5 pb-2 pt-1.5">
              <button
                type="button"
                onClick={() => answer("yes")}
                className="flex-1 rounded-full bg-gradient-to-r from-[#9747FF] to-[#7C3AED] py-1 text-[10px] font-bold text-white shadow-sm active:scale-[0.97] transition-all hover:from-[#8A3BFF] hover:to-[#6D28D9]"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => answer("no")}
                className="flex-1 rounded-full border border-gray-200 bg-white py-1 text-[10px] font-bold text-gray-500 hover:border-[#C9A6FF] active:scale-[0.97] transition-all"
              >
                No
              </button>
            </div>
          )}
        </div>
      )}

      {rewardsOpen && (
        <RewardsModal open={rewardsOpen} onClose={() => setRewardsOpen(false)} />
      )}
    </>
  );
}
