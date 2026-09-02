import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, Gift, Coins, RefreshCw, BadgeDollarSign } from "lucide-react";
import flipkartSuperCoinImg from "@/assets/FlipKartSuperCoin-removebg-preview.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import partnerImg from "@/assets/coorp.png";
import rakhihomeImg from "@/assets/featheroverlay.png";
import UberSuperCoinNudge from "@/components/UberSuperCoinNudge";
import BlinkitSuperCoinNudge from "@/components/BlinkitSuperCoinNudge";
import BataSuperCoinNudge from "@/components/BataSuperCoinNudge";

type InstantGiftingBannerProps = {
  onExplore?: () => void;
  onPartnerClick?: () => void;
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
        <img
          src={partnerImg}
          alt="Partner With Us"
          className="w-[80px] h-[80px] object-contain drop-shadow-lg"
        />
      </div>
    </div>
  );
}

export default function InstantGiftingBanner({ onExplore, onPartnerClick }: InstantGiftingBannerProps) {
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const intervalRef = useRef<number>(0);
  const userPausedRef = useRef(false);

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
        const next = (prev + 1) % 4;
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
        @keyframes gold-pulse {
          0%, 100% { filter: drop-shadow(0 0 4px rgba(255,200,0,0.3)); transform: scale(1); }
          25% { filter: drop-shadow(0 0 12px rgba(255,200,0,0.7)) drop-shadow(0 0 24px rgba(255,180,0,0.4)); transform: scale(1.05); }
          50% { filter: drop-shadow(0 0 20px rgba(255,200,0,1)) drop-shadow(0 0 40px rgba(255,180,0,0.6)) drop-shadow(0 0 60px rgba(255,150,0,0.2)); transform: scale(1.1); }
          75% { filter: drop-shadow(0 0 12px rgba(255,200,0,0.7)) drop-shadow(0 0 24px rgba(255,180,0,0.4)); transform: scale(1.05); }
        }
      `}</style>
      <img src={rakhihomeImg} alt="" className="absolute -top-3 -left-3 h-[72px] w-[72px] object-contain opacity-80 pointer-events-none z-0" />
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
            <UberSuperCoinNudge onExplore={onExplore} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <BlinkitSuperCoinNudge onExplore={onExplore} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <BataSuperCoinNudge onExplore={onExplore} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <PartnerSlide onPartnerClick={onPartnerClick} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2.5">
          {[0, 1, 2, 3].map((i) => (
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
    </section>
  );
}
