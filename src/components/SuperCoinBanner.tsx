import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

type Props = { onOpenGuide?: () => void };

export default function SuperCoinBanner({ onOpenGuide }: Props) {
  return (
    <button
      type="button"
      onClick={onOpenGuide}
      aria-haspopup="dialog"
      className="relative block w-full h-[185px] overflow-hidden rounded-xl text-left cursor-pointer active:scale-[0.98] transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 55%, #5365DF 100%)" }}
    >
      <style>{`
        @keyframes sc-banner-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes sc-banner-tilt { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
        @keyframes sc-banner-shimmer { 0% { transform: translateX(-140%) skewX(-18deg); opacity: 0; } 15% { opacity: 0.7; } 55%, 100% { transform: translateX(240%) skewX(-18deg); opacity: 0; } }
        @keyframes sc-banner-chip { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes sc-banner-arrow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
        @keyframes sc-banner-twinkle { 0%, 100% { opacity: 0.15; transform: scale(0.6); } 50% { opacity: 1; transform: scale(1); } }
        .sc-banner-anim { animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
        .sc-float { animation-name: sc-banner-float; animation-duration: 3s; }
        .sc-tilt { animation-name: sc-banner-tilt; animation-duration: 4.5s; animation-direction: alternate; }
        .sc-shimmer { animation-name: sc-banner-shimmer; animation-duration: 4s; }
        .sc-chip { animation-name: sc-banner-chip; animation-duration: 2.5s; }
        .sc-arrow { animation-name: sc-banner-arrow; animation-duration: 1.6s; }
        .sc-twinkle { animation-name: sc-banner-twinkle; animation-duration: 2.2s; }
        @media (prefers-reduced-motion: reduce) {
          .sc-banner-anim { animation: none !important; }
        }
      `}</style>

      {/* Decorative glows */}
      <div className="absolute -top-8 -left-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 right-8 w-24 h-24 rounded-full bg-white/10 blur-lg pointer-events-none" />

      <div className="relative z-10 h-full flex items-center justify-between gap-2 px-4 py-3">
        {/* Left column */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[8px] font-bold tracking-wider text-white">
            NEW · SuperCoins
          </span>
          <h2 className="text-[15px] font-bold text-white leading-tight">
            How to use SuperCoins
          </h2>
          <span
            className="sc-banner-anim sc-chip inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-[3px] text-[9px] font-extrabold text-[#6D28D9] shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            style={{ animationDelay: "0.4s" }}
          >
            <img src={superCoinImg} alt="" className="w-[11px] h-[11px] object-contain" />
            Convert SC to instant savings
          </span>
          <div className="flex items-center gap-1 pt-0.5 text-[9px] font-semibold text-white">
            <span>See how it works</span>
            <span className="sc-banner-anim sc-arrow inline-block">→</span>
          </div>
        </div>

        {/* Right column — coin */}
        <div className="relative w-[96px] h-[150px] flex-shrink-0 flex items-center justify-center -mr-4">
          {/* Sparkles */}
          <span
            className="sc-banner-anim sc-twinkle absolute top-4 left-2 w-[5px] h-[5px] rounded-full bg-white"
            style={{ animationDelay: "0.2s" }}
          />
          <span
            className="sc-banner-anim sc-twinkle absolute bottom-6 left-4 w-[4px] h-[4px] rounded-full bg-white"
            style={{ animationDelay: "1.1s" }}
          />
          <span
            className="sc-banner-anim sc-twinkle absolute top-8 right-2 w-[6px] h-[6px] rounded-full bg-white"
            style={{ animationDelay: "1.7s" }}
          />

          <div className="sc-banner-anim sc-float">
            <div className="sc-banner-anim sc-tilt">
              <div className="relative overflow-hidden rounded-full">
                <img
                  src={superCoinImg}
                  alt="SuperCoin"
                  className="w-[92px] h-[92px] object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
                />
                {/* Shimmer sweep */}
                <span
                  className="sc-banner-anim sc-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
