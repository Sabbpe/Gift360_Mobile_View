import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import flipkartSuperCoinImg from "@/assets/FlipKartSuperCoin-removebg-preview.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

type SuperCoinsConversionBannerProps = {
  onExplore?: () => void;
};

export default function SuperCoinsConversionBanner({
  onExplore,
}: SuperCoinsConversionBannerProps) {
  const [, setLocation] = useLocation();

  const handleClick = onExplore || (() => setLocation("/brands?supercoins=1"));

  return (
    <section className="px-[21px] pt-[18px]">
      <button
        type="button"
        onClick={handleClick}
        className="group relative w-full overflow-hidden rounded-[22px] border border-[#f0e3b8] bg-[linear-gradient(135deg,#15112e_0%,#2c2460_45%,#0f172a_100%)] text-left shadow-[0_18px_40px_rgba(15,23,42,0.22)] active:scale-[0.99]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,214,102,0.24),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.28),transparent_38%)]" />
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.12)_50%,transparent_80%)]" />

        <div className="relative flex items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[8px] font-bold tracking-[0.22em] text-[#f7d46b]">
              SUPERCOINS
            </span>
            <h2 className="mt-2 text-[16px] font-bold leading-tight tracking-[-0.02em] text-white">
              Convert your SuperCoins to a Flipkart voucher
            </h2>
            <p className="mt-1 max-w-[220px] text-[10px] leading-snug text-white/70">
              Open only the eligible brands that support SuperCoins redemption.
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-semibold text-[#1e2a5a] shadow-sm transition-transform group-active:scale-[0.98]">
              <span>Explore eligible brands</span>
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
          </div>

          <div className="relative flex h-[92px] w-[92px] shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#f7d46b]/15 blur-2xl" />
            <img
              src={flipkartSuperCoinImg}
              alt="Flipkart SuperCoin"
              className="relative z-10 h-[64px] w-[64px] object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.28)]"
            />
            <img
              src={superCoinImg}
              alt=""
              className="absolute left-1 top-2 h-4 w-4 object-contain opacity-80"
            />
            <img
              src={superCoinImg}
              alt=""
              className="absolute bottom-3 right-2 h-3.5 w-3.5 object-contain opacity-70"
            />
          </div>
        </div>
      </button>
    </section>
  );
}
