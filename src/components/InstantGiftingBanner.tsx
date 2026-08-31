import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, ShoppingCart, Gift, Store, Coins, RefreshCw, BadgeDollarSign } from "lucide-react";
import flipkartSuperCoinImg from "@/assets/FlipKartSuperCoin-removebg-preview.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import partnerImg from "@/assets/coorp.png";
import rakhihomeImg from "@/assets/featheroverlay.png";

type InstantGiftingBannerProps = {
  onExplore?: () => void;
  onPartnerClick?: () => void;
};

const stepFlowData = [
  { number: "Step 1", Icon: Store, title: "Pick a brand", description: "From 500+ options" },
  { number: "Step 2", Icon: ShoppingCart, title: "Buy instantly", description: "UPI, cards, wallet" },
  { number: "Step 3", Icon: Gift, title: "Send instantly", description: "Straight to their phone" },
];

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

function StepFlowSlide({ onExplore }: { onExplore?: () => void }) {
  return (
    <div className="relative w-full h-[185px] flex flex-col px-4 py-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-gray-400 mb-0.5">
            Instant gifting
          </p>
          <h2 className="text-[13px] font-bold text-gray-900 tracking-tight leading-snug">
            Pick a brand, buy a voucher, send it in seconds
          </h2>
        </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-semibold text-white shadow-md active:scale-[0.97] transition-all bg-[#7C3AED]"
          >
          Start gifting
          <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-[2px]" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-between relative">
        {stepFlowData.map((step, i) => (
          <div key={step.number} className="relative flex flex-col items-center text-center flex-1">
            {i < stepFlowData.length - 1 && (
              <div className="absolute top-[18px] left-[calc(50%+16px)] right-[calc(-50%+16px)] h-[1.5px] border-t-2 border-dashed border-purple-200" />
            )}
            <div className="relative z-10 mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-purple-50">
              <step.Icon className="h-4 w-4 text-[#7C3AED]" strokeWidth={2} />
            </div>
            <p className="text-[7px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
              {step.number}
            </p>
            <p className="text-[10px] font-bold text-gray-900 leading-tight mb-px">
              {step.title}
            </p>
            <p className="text-[8px] text-gray-500">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuperCoinSlide({ onExplore }: { onExplore?: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-[185px] flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0 space-y-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-bold tracking-wider text-white bg-[#7C3AED]">
          REWARDS
        </span>
        <h2 className="text-[14px] font-bold text-gray-900 leading-tight">
          Earn <span className="text-[#7C3AED]">SuperCoins</span> on every purchase
        </h2>
        <p className="text-[9px] text-gray-500 leading-snug">
          Get rewarded every time you buy or send a gift voucher.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[9px] font-semibold text-white shadow-md active:scale-[0.97] transition-all bg-[#7C3AED]"
          >
            Explore Now
            <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-50">
              <Coins className="h-3 w-3 text-[#7C3AED]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[8px] font-bold text-gray-900 leading-tight">SuperCoins</p>
              <p className="text-[7px] text-gray-500 leading-tight">Redeem across 500+ brands</p>
            </div>
          </div>
        </div>
      </div>
      <div className="relative w-[100px] h-[140px] flex-shrink-0 flex items-center justify-center">
        {visible && [
          { x: 5, y: 5, size: 12, delay: 0, dur: 2.8 },
          { x: 50, y: 2, size: 10, delay: 0.5, dur: 3.2 },
          { x: 80, y: 8, size: 11, delay: 1.0, dur: 2.6 },
          { x: 20, y: 100, size: 10, delay: 0.3, dur: 2.7 },
          { x: 60, y: 105, size: 12, delay: 0.9, dur: 3.1 },
          { x: 85, y: 100, size: 9, delay: 1.3, dur: 2.5 },
        ].map((coin, i) => (
          <img
            key={i}
            src={superCoinImg}
            alt=""
            className="absolute pointer-events-none"
            style={{
              left: coin.x,
              top: coin.y,
              width: coin.size,
              height: coin.size,
              animation: `coin-float ${coin.dur}s ease-in-out ${coin.delay}s infinite`,
              opacity: 0,
              filter: "drop-shadow(0 0 4px rgba(255,200,0,0.5))",
            }}
          />
        ))}
        <img
          src={flipkartSuperCoinImg}
          alt="Flipkart SuperCoin"
          className="relative z-10 w-[60px] h-[60px] object-contain"
          style={{ animation: "gold-pulse 1.5s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
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
        const next = (prev + 1) % 3;
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
            <SuperCoinSlide onExplore={onExplore} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <StepFlowSlide onExplore={onExplore} />
          </div>
          <div className="flex-shrink-0 w-full snap-start">
            <PartnerSlide onPartnerClick={onPartnerClick} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2.5">
          {[0, 1, 2].map((i) => (
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
