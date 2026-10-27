import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Gift, Coins, RefreshCw, BadgeDollarSign } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOccasions } from "@/hooks/useOccasions";
import { occasionSlug } from "@/lib/occasionSlug";
import { getRewardStatus, startQuizFromBanner, type QuizRewardStatus } from "@/api/rewardApi";
import JanmashtamiQuizModal from "@/components/JanmashtamiQuizModal";
import partnerImg from "@/assets/coorp.png";
import cashBannerImg from "@/assets/cashhbanner.png";
import occasionImg from "@/assets/occasion.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import BlinkitSuperCoinNudge from "@/components/BlinkitSuperCoinNudge";
import BataSuperCoinNudge from "@/components/BataSuperCoinNudge";
import SuperCoinIntroModal from "@/components/SuperCoinIntroModal";

const BLINKIT_BRAND_ID = "a5fea1a3-3e17-414f-a953-407125080d77";
const BATA_BRAND_ID = "335f53f7-68f6-4eb0-be45-e571c1044cf9";
const TOTAL_SLIDES = 7;

type InstantGiftingBannerProps = {
  onExplore?: () => void;
  onPartnerClick?: () => void;
  onBuyNow?: (brandId: string) => void;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function PartnerSlide({ onPartnerClick }: { onPartnerClick?: () => void }) {
  return (
    <div className="relative w-full h-[185px] flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider text-white bg-[#7C3AED]">
          PARTNER
        </span>
        <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
          Unlock <span className="text-[#7C3AED]">bulk pricing</span> as a partner
        </h2>
        <p className="text-[9px] text-gray-500 leading-snug">
          Bulk pricing, smart reselling, and corporate gifting — all in one place.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onPartnerClick}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-semibold text-white shadow-md active:scale-[0.97] transition-all bg-[#7C3AED]"
          >
            Partner With Us
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-2">
            {[
              { Icon: BadgeDollarSign, label: "Bulk\nPricing" },
              { Icon: RefreshCw, label: "Smart\nReselling" },
              { Icon: Gift, label: "Corporate\nGifting" },
            ].map((chip) => (
              <div key={chip.label} className="flex flex-col items-center gap-0.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-purple-50">
                  <chip.Icon className="h-3 w-3 text-[#7C3AED]" strokeWidth={2} />
                </div>
                <span className="text-[6px] font-semibold text-gray-600 leading-tight text-center whitespace-pre-line">{chip.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="relative w-[90px] h-[140px] flex-shrink-0 flex items-center justify-center">
        <img loading="lazy" decoding="async"
          src={partnerImg}
          alt="Partner With Us"
          className="w-[80px] h-[80px] object-contain drop-shadow-lg"
        />
      </div>
    </div>
  );
}

/** Slide 2 — points at the existing "convert coins" guide (SuperCoinGuideSheet). */
function ConvertCoinsSlide({ onViewGuide }: { onViewGuide: () => void }) {
  return (
    <div
      className="relative w-full h-[185px] flex items-center justify-between px-4 py-3 gap-3"
      style={{ background: "linear-gradient(135deg, #5B2B99 0%, #7C3AED 100%)" }}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider text-[#5B2B99] bg-[#F7D46B]">
          CONVERT COINS
        </span>
        <h2 className="text-[15px] font-bold text-white leading-tight">
          Turn SuperCoins into gift vouchers
        </h2>
        <p className="text-[10px] text-white/85 leading-snug">
          See how converting coins cuts what you pay — the full step-by-step guide.
        </p>
        <button
          type="button"
          onClick={onViewGuide}
          className="mt-1 inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-[10px] font-bold text-[#5B2B99] bg-white shadow-md active:scale-[0.97] transition-all"
        >
          View guide
          <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
      <div className="w-[80px] h-[80px] flex-shrink-0 flex items-center justify-center rounded-full bg-white/15">
        <img loading="lazy" decoding="async" src={superCoinImg} alt="" className="h-10 w-10 object-contain anim-sc-wiggle" />
      </div>
    </div>
  );
}

/**
 * Slide 3 — occasion shortcuts. Chips come straight from /v1/occasions (the
 * same ordered list the Home occasion sections are built from); tapping one
 * smooth-scrolls to that section. Chip styling mirrors the SuperCoins intro
 * tabs so it reads like the rest of the app.
 */
function OccasionSlide({
  occasions,
  pending,
  selected,
  onSelect,
}: {
  occasions: string[];
  pending: boolean;
  selected: string | null;
  onSelect: (occasion: string) => void;
}) {
  const list = occasions.filter((o) => o.trim().toLowerCase() !== "top brands");
  return (
    <div className="relative w-full h-[185px] flex items-center px-4 py-3 overflow-hidden">
      {/* Festive backdrop — empty cream space on the left carries the content */}
      <img
        loading="lazy"
        decoding="async"
        src={occasionImg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
      />
      {/* Left column only — clears the gift-box/arch art on the right */}
      <div className="relative flex-1 max-w-[50%] space-y-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-extrabold tracking-[0.14em] text-white bg-[#7C3AED] shadow-[0_2px_6px_rgba(124,58,237,0.35)]">
          OCCASIONS
        </span>
        <h2 className="text-[16px] font-extrabold text-gray-900 leading-[1.15] tracking-[-0.01em]">
          Offers for <span className="text-[#7C3AED]">every occasion</span>
        </h2>
        <p className="text-[10px] font-semibold text-gray-600 leading-snug">
          Pick one — jump straight to its picks.
        </p>
        <div className="no-scrollbar flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto pt-0.5">
          {pending ? (
            [0, 1, 2, 3].map((i) => (
              <span key={i} className="g-skeleton h-[26px] w-[64px] rounded-full" />
            ))
          ) : list.length ? (
            list.map((occasion) => {
              const active = selected === occasion;
              return (
                <button
                  key={occasion}
                  type="button"
                  onClick={() => onSelect(occasion)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold leading-none transition-all active:scale-95 ${
                    active
                      ? "bg-gradient-to-r from-[#9747FF] to-[#7C3AED] text-white shadow-[0_4px_10px_rgba(124,58,237,0.4)]"
                      : "border border-[#E2D9FF] bg-white text-[#7C3AED] shadow-[0_2px_6px_rgba(124,58,237,0.10)] hover:border-[#7C3AED]/50"
                  }`}
                >
                  {occasion}
                </button>
              );
            })
          ) : (
            <span className="text-[10px] font-semibold text-gray-400">Loading occasions…</span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizSlide({ title, sub, cta, onPlay, busy }: { title: string; sub: string; cta?: string; onPlay?: () => void; busy?: boolean }) {
  return (
    <div className="relative w-full h-[185px] flex items-center justify-between px-4 py-3 gap-3"
      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B2B99 100%)" }}>
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider text-[#5B2B99] bg-[#F7D46B]">
          QUIZ
        </span>
        <h2 className="text-[15px] font-bold text-white leading-tight">{title}</h2>
        <p className="text-[10px] text-white/85 leading-snug">{sub}</p>
        {cta && (
          <button
            type="button"
            onClick={onPlay}
            disabled={busy}
            className="mt-1 inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-[10px] font-bold text-[#5B2B99] bg-white shadow-md active:scale-[0.97] transition-all disabled:opacity-60"
          >
            {busy ? "Opening..." : cta}
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="w-[80px] h-[80px] flex-shrink-0 flex items-center justify-center rounded-full bg-white/15">
        <Coins className="h-10 w-10 text-[#F7D46B]" strokeWidth={1.8} />
      </div>
    </div>
  );
}

export default function InstantGiftingBanner({ onExplore, onPartnerClick, onBuyNow }: InstantGiftingBannerProps) {
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const intervalRef = useRef<number>(0);
  const userPausedRef = useRef(false);

  // Quiz slide: starts the quiz for the logged-in customer. Win = all 5 correct, then buy within
  // 5 minutes and 5 bonus SuperCoins are credited. After a win we send the customer to the SuperCoin modal.
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const [quizReward, setQuizReward] = useState<QuizRewardStatus | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizNote, setQuizNote] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const { data: rewardStatus } = useQuery({
    queryKey: ["rewardStatus", user?.clientId],
    queryFn: () => getRewardStatus(user!.clientId),
    enabled: !!user?.clientId,
  });
  const quizEarned = rewardStatus?.status === "REDEEMED" || rewardStatus?.status === "CLAIMED";
  const quizWon = rewardStatus?.status === "PENDING"
    && !!rewardStatus.expiresAt && new Date(rewardStatus.expiresAt).getTime() > Date.now();

  const handleQuizPlay = useCallback(async () => {
    setQuizNote(null);
    if (!user?.clientId) { setLocation("/login"); return; }
    if (quizWon) { setLocation("/supercoin-voucher"); return; }
    setQuizBusy(true);
    try {
      const reward = await startQuizFromBanner(user.clientId);
      if (reward?.publicId && reward.quizStartExpiresAt
          && (reward.status === "AVAILABLE" || reward.status === "IN_PROGRESS")) {
        setQuizReward(reward);
        setQuizOpen(true);
      } else if (reward?.status === "PENDING") {
        setLocation("/supercoin-voucher");
      } else {
        setQuizNote("You have used your quiz attempts for today. Try again tomorrow.");
      }
    } catch {
      setQuizNote("The quiz is not available right now. Please try again.");
    } finally {
      setQuizBusy(false);
    }
  }, [user?.clientId, quizWon, setLocation]);

  // When the quiz closes, refresh the status. A win (PENDING) takes the customer to the SuperCoin modal.
  const handleQuizClose = useCallback(async () => {
    setQuizOpen(false);
    if (!user?.clientId) return;
    try {
      const fresh = await getRewardStatus(user.clientId, quizReward?.publicId ?? undefined);
      queryClient.invalidateQueries({ queryKey: ["rewardStatus", user.clientId] });
      if (fresh?.status === "PENDING") setLocation("/supercoin-voucher");
    } catch { /* ignore */ }
  }, [user?.clientId, quizReward?.publicId, queryClient, setLocation]);

  const scrollTo = useCallback(
    (index: number) => {
      const container = scrollRef.current;
      if (!container) return;
      const cardWidth = container.offsetWidth;
      container.scrollTo({ left: index * cardWidth, behavior: reduced ? "auto" : "smooth" });
      setSelectedIndex(index);
    },
    [reduced]
  );

  const startAutoplay = useCallback(() => {
    window.clearInterval(intervalRef.current);
    if (reduced || userPausedRef.current) return;
    intervalRef.current = window.setInterval(() => {
      setSelectedIndex((prev) => {
        const next = (prev + 1) % TOTAL_SLIDES;
        scrollTo(next);
        return next;
      });
    }, 3000);
  }, [reduced, scrollTo]);

  const stopAutoplay = useCallback(() => {
    window.clearInterval(intervalRef.current);
  }, []);

  const goToSlide = useCallback(
    (index: number) => {
      scrollTo(index);
      userPausedRef.current = true;
      stopAutoplay();
    },
    [scrollTo, stopAutoplay]
  );

  // Slide 3 — occasion shortcuts. The sections below render one block per
  // occasion from the SAME /v1/occasions list, so the chip just smooth-scrolls
  // to its anchor (and holds the carousel so the user can read the section).
  const { data: occasions = [], isPending: occasionsPending } = useOccasions();
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);

  const scrollToOccasion = useCallback(
    (occasion: string) => {
      setSelectedOccasion(occasion);
      userPausedRef.current = true;
      stopAutoplay();
      document
        .getElementById(`occasion-${occasionSlug(occasion)}`)
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    },
    [reduced, stopAutoplay]
  );

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  return (
    <section className="relative w-full">
      <style>{`
        @keyframes coin-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          50% { transform: translateY(-8px) rotate(10deg); opacity: 1; }
        }
        @keyframes gold-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,200,0,0.3)); transform: scale(1); }
          25% { filter: drop-shadow(0 0 12px rgba(255,200,0,0.7)) drop-shadow(0 0 24px rgba(255,180,0,0.4)); transform: scale(1.05); }
          50% { filter: drop-shadow(0 0 20px rgba(255,200,0,1)) drop-shadow(0 0 40px rgba(255,180,0,0.6)) drop-shadow(0 0 60px rgba(255,150,0,0.2)); transform: scale(1.1); }
          75% { filter: drop-shadow(0 0 12px rgba(255,200,0,0.7)) drop-shadow(0 0 24px rgba(255,180,0,0.4)); transform: scale(1.05); }
        }
      `}</style>
      <div
        className="w-full overflow-hidden rounded-[20px] border border-[#EDEDED] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] bg-white"
        onTouchStart={stopAutoplay}
        onTouchEnd={() => { if (!userPausedRef.current) startAutoplay(); }}
      >
        <div
          ref={scrollRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none"
          style={{
            background: "linear-gradient(135deg, #FFF9F0 0%, #F8F6FF 60%, #F3F1FE 100%)",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <div className="flex-shrink-0 w-full snap-start">
            {/* Cashback banner — opens Brands with the "Upto 15%" filter on */}
            <button
              type="button"
              onClick={() =>
                setLocation(
                  "/brands?discount=Up%20to%205%25&discount=5%25%20-%2015%25"
                )
              }
              className="relative block h-[185px] w-full overflow-hidden text-left active:scale-[0.995] transition-transform"
              aria-label="Shop now — save upto 30% with Cashback wallet points"
            >
              <img
                loading="lazy"
                decoding="async"
                src={cashBannerImg}
                alt="Save upto 30% with Cashback wallet points"
                className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
              />
              <style>{`
                @keyframes save-wiggle {
                  0%, 100% { transform: rotate(-5deg) translateY(0); }
                  25%      { transform: rotate(3deg) translateY(-4px); }
                  75%      { transform: rotate(5deg) translateY(-2px); }
                }
                .save-wiggle-1 { animation: save-wiggle 1.4s ease-in-out infinite;       transform-origin: 50% 75%; }
                .save-wiggle-2 { animation: save-wiggle 1.4s ease-in-out 0.16s infinite; transform-origin: 50% 75%; }
                .save-wiggle-3 { animation: save-wiggle 1.4s ease-in-out 0.32s infinite; transform-origin: 50% 75%; }
                @media (prefers-reduced-motion: reduce) {
                  .save-wiggle-1, .save-wiggle-2, .save-wiggle-3 { animation: none !important; }
                }
              `}</style>
              {/* Left column only — starts at the slide's standard left margin (px-4,
                  same as the other slides); max-w keeps the right-side art free */}
              <div className="relative flex h-full max-w-[56%] flex-col justify-center gap-1.5 pl-4 pr-2">
                <div aria-hidden="true" className="flex items-baseline gap-1.5 text-[21px] font-black italic leading-none tracking-tight">
                  <span className="save-wiggle-1 text-[#4C1D95] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">Save</span>
                  <span className="save-wiggle-2 text-[#7C3AED] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">Save</span>
                  <span className="save-wiggle-3 text-[#4C1D95] drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]">Save</span>
                </div>
                <p className="text-[11.5px] font-extrabold leading-[1.2] text-[#5B2B99]">
                  Save upto 30% with Cashback wallet points
                </p>
                <span className="inline-flex w-fit items-center gap-1 rounded-lg bg-[#7C3AED] px-3.5 py-1.5 text-[10px] font-bold text-white shadow-md">
                  Shop Now
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </div>
            </button>
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <ConvertCoinsSlide onViewGuide={() => setGuideOpen(true)} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <OccasionSlide
              occasions={occasions}
              pending={occasionsPending}
              selected={selectedOccasion}
              onSelect={scrollToOccasion}
            />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            {quizEarned ? (
              <QuizSlide title="Quiz reward earned" sub="Your 5 bonus SuperCoins have been credited. Thanks for playing." />
            ) : quizWon ? (
              <QuizSlide
                title="You won! Buy now to get 5 SuperCoins"
                sub="Complete a purchase within 5 minutes of your win and 5 bonus SuperCoins are credited after your voucher is issued."
                cta="Buy now"
                onPlay={handleQuizPlay}
              />
            ) : (
              <QuizSlide
                title="Answer 5 questions, win 5 SuperCoins"
                sub={quizNote || "Get all 5 right, then buy within 5 minutes and we credit 5 bonus SuperCoins."}
                cta="Play now"
                onPlay={handleQuizPlay}
                busy={quizBusy}
              />
            )}
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <BlinkitSuperCoinNudge onExplore={onExplore} onBuyNow={onBuyNow ? () => onBuyNow(BLINKIT_BRAND_ID) : undefined} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <BataSuperCoinNudge onExplore={onExplore} onBuyNow={onBuyNow ? () => onBuyNow(BATA_BRAND_ID) : undefined} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <PartnerSlide onPartnerClick={onPartnerClick} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2.5">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => i).map((i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`rounded-full transition-all duration-300 ${selectedIndex === i ? "w-5 h-1.5" : "w-1.5 h-1.5"}`}
              style={{ background: selectedIndex === i ? "#7C3AED" : "#D1D5DB" }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
      {quizReward?.publicId && quizReward.quizStartExpiresAt && (
        <JanmashtamiQuizModal
          open={quizOpen}
          onClose={handleQuizClose}
          rewardPublicId={quizReward.publicId}
          quizStartExpiresAt={quizReward.quizStartExpiresAt}
        />
      )}
      <SuperCoinIntroModal open={guideOpen} onClose={() => setGuideOpen(false)} initialTab="convert" />
    </section>
  );
}
