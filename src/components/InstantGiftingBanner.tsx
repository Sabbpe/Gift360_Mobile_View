import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Gift, RefreshCw, BadgeDollarSign } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { getRewardStatus, startQuizFromBanner, type QuizRewardStatus } from "@/api/rewardApi";
import JanmashtamiQuizModal from "@/components/JanmashtamiQuizModal";
import partnerImg from "@/assets/coorp.png";
import appBanner480 from "@/assets/banners/app-download-banner-480.webp";
import appBanner800 from "@/assets/banners/app-download-banner-800.webp";
import quizBanner480 from "@/assets/banners/quiz-banner-480.webp";
import quizBanner800 from "@/assets/banners/quiz-banner-800.webp";
import coinsBanner480 from "@/assets/banners/coins-to-voucher-banner-480.webp";
import coinsBanner800 from "@/assets/banners/coins-to-voucher-banner-800.webp";
import SuperCoinIntroModal from "@/components/SuperCoinIntroModal";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.gift360.gift360";
const TOTAL_SLIDES = 4;
/** Banner is full card width: ~92vw on phones, capped near 520px on wider screens. */
const BANNER_SIZES = "(max-width: 560px) 92vw, 520px";
const bannerSrc = (small: string, large: string) => ({ src: small, srcSet: `${small} 480w, ${large} 800w` });

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
    <div className="relative w-full h-full flex items-center justify-between px-4 py-3 gap-3">
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

/**
 * Full-bleed artwork banner. The artwork already carries the headline, the
 * CTA button and (for the app slide) the Google Play badge, so the whole
 * slide is the tap target. A gold shine sweeps across it and a small callout
 * chip pulses in the corner to draw the eye; both are skipped for users who
 * prefer reduced motion.
 */
function ImageBannerSlide({
  src,
  srcSet,
  alt,
  callout,
  calloutPosition = "top-right",
  href,
  onClick,
  busy,
  note,
  reduced,
  eager,
}: {
  src: string;
  srcSet?: string;
  alt: string;
  callout?: string;
  /** Corner for the callout chip, chosen per artwork so it never covers the copy. */
  calloutPosition?: "top-right" | "bottom-left";
  href?: string;
  onClick?: () => void;
  busy?: boolean;
  note?: string | null;
  reduced: boolean;
  eager?: boolean;
}) {
  const inner = (
    <>
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? BANNER_SIZES : undefined}
        width={480}
        height={268}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none"
      />
      {!reduced && <span aria-hidden className="g360-banner-shine pointer-events-none absolute inset-0" />}
      {callout && (
        <span
          className={`absolute ${calloutPosition === "bottom-left" ? "left-2.5 bottom-2.5" : "right-2.5 top-2.5"} inline-flex items-center gap-1 rounded-full bg-[#F7D46B] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#5B2B99] shadow-[0_4px_12px_rgba(0,0,0,0.25)] ${reduced ? "" : "g360-callout-pulse"}`}
        >
          {callout}
        </span>
      )}
      {(busy || note) && (
        <span className="absolute inset-x-2.5 bottom-2.5 rounded-lg bg-black/70 px-3 py-1.5 text-center text-[11px] font-semibold text-white backdrop-blur-sm">
          {busy ? "Opening quiz..." : note}
        </span>
      )}
    </>
  );

  const className =
    "relative block h-full w-full overflow-hidden text-left active:scale-[0.995] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#7C3AED]";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={alt}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={busy} className={className} aria-label={alt}>
      {inner}
    </button>
  );
}

// onExplore / onBuyNow are kept in the props type for existing callers; the
// Blinkit/Bata nudge slides that used them have been retired.
export default function InstantGiftingBanner({ onPartnerClick }: InstantGiftingBannerProps) {
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
        @keyframes g360-shine {
          0% { transform: translateX(-120%) skewX(-20deg); }
          60%, 100% { transform: translateX(220%) skewX(-20deg); }
        }
        .g360-banner-shine::after {
          content: "";
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 35%;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,236,170,0.35) 50%, rgba(255,255,255,0) 100%);
          animation: g360-shine 3.2s ease-in-out infinite;
        }
        @keyframes g360-callout {
          0%, 100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 0 0 0 rgba(247,212,107,0.7); }
          50% { transform: scale(1.06); box-shadow: 0 4px 12px rgba(0,0,0,0.25), 0 0 0 6px rgba(247,212,107,0); }
        }
        .g360-callout-pulse { animation: g360-callout 1.6s ease-in-out infinite; }
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
          {/* 1 — App download */}
          <div className="flex-shrink-0 w-full snap-start aspect-[1376/768]">
            <ImageBannerSlide
              {...bannerSrc(appBanner480, appBanner800)}
              alt="Gift360 is now on Google Play. Get it on Google Play"
              callout="Get the app"
              calloutPosition="bottom-left"
              href={PLAY_STORE_URL}
              reduced={reduced}
              eager
            />
          </div>
          {/* 2 — Quiz */}
          <div className="flex-shrink-0 w-full snap-start aspect-[1376/768]">
            <ImageBannerSlide
              {...bannerSrc(quizBanner480, quizBanner800)}
              alt="Quiz: answer 5 questions and win 5 SuperCoins"
              callout={quizEarned ? "Reward earned" : quizWon ? "You won! Buy now" : "Play now"}
              onClick={quizEarned ? undefined : handleQuizPlay}
              busy={quizBusy}
              note={
                quizEarned
                  ? "Your 5 bonus SuperCoins have been credited."
                  : quizWon
                    ? "Buy within 5 minutes of your win to get 5 SuperCoins."
                    : quizNote
              }
              reduced={reduced}
            />
          </div>
          {/* 3 — Convert SuperCoins to vouchers */}
          <div className="flex-shrink-0 w-full snap-start aspect-[1376/768]">
            <ImageBannerSlide
              {...bannerSrc(coinsBanner480, coinsBanner800)}
              alt="Turn SuperCoins into gift vouchers. View the guide"
              callout="How it works"
              calloutPosition="bottom-left"
              onClick={() => setGuideOpen(true)}
              reduced={reduced}
            />
          </div>
          {/* 4 — Partner / bulk pricing */}
          <div className="flex-shrink-0 w-full snap-start aspect-[1376/768]">
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
