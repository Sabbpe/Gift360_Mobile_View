import { ChevronRight, Sparkles } from "lucide-react";
import voucherCover from "@/assets/voucher-cover.png";
import voucherRevealed from "@/assets/voucher-revealed.png";
import { StatusBar } from "./StatusBar";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

/**
 * Onboarding 2 — "Buy in Seconds". Post-purchase animation: a stack of
 * gift voucher cards with a "Scratch to Reveal" cover that wipes away to
 * expose the actual voucher (card number + PIN). Sparkles trail the
 * scratching finger for a magical reveal feel. Loops every 4.5s.
 */
export const Onboarding2 = ({ onNext, onSkip }: Props) => {
  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
      <StatusBar />

      {/* Decorative bg circles */}
      <div className="absolute top-24 right-0 w-20 h-20 rounded-full bg-orange-200/60" />
      <div className="absolute top-44 right-12 w-3 h-3 rounded-full bg-orange-300" />
      <div className="absolute top-72 left-3 w-3 h-3 rounded-full bg-amber-300" />
      <div className="absolute bottom-1/3 left-0 w-20 h-20 rounded-full bg-amber-200/60" />

      {/* Hero stage — phone with scratchable voucher inside */}
      <div className="relative flex-1 flex items-center justify-center pt-2">
        <div className="absolute w-72 h-72 rounded-full bg-amber-50" />

        {/* Phone mockup */}
        <div className="relative z-10 anim-fade-up">
          <div
            className="rounded-[32px] p-[3px] shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, #1f2937 0%, #0f172a 60%, #1f2937 100%)",
            }}
          >
            <div className="rounded-[30px] bg-black p-1.5">
              <div className="relative w-[200px] h-[340px] rounded-[26px] bg-gradient-to-b from-amber-50 via-white to-orange-50 overflow-hidden flex flex-col">
                {/* Dynamic island */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded-full bg-black z-30" />

                {/* Top status */}
                <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] font-semibold text-slate-700">
                  <span>9:41</span>
                  <span className="w-12" />
                  <span className="opacity-70">●●●●</span>
                </div>

                {/* Title */}
                <div className="px-3 pt-3 pb-2 text-center">
                  <p className="text-[10px] font-bold text-slate-800">
                    Voucher Purchased
                  </p>
                  <p className="text-[8px] text-emerald-600 font-medium">
                    Order #32198 · Success
                  </p>
                </div>

                {/* Stack of vouchers (back cards for depth) */}
                <div className="relative flex-1 flex items-center justify-center px-3">
                  {/* Back card 2 */}
                  <div
                    className="absolute w-[160px] h-[110px] rounded-[14px] shadow-md"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffd089 0%, #ff8a3d 100%)",
                      transform: "rotate(-7deg) translateY(8px)",
                      opacity: 0.55,
                    }}
                  />
                  {/* Back card 1 */}
                  <div
                    className="absolute w-[164px] h-[112px] rounded-[14px] shadow-md"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffc066 0%, #ff7a25 100%)",
                      transform: "rotate(4deg) translateY(4px)",
                      opacity: 0.75,
                    }}
                  />

                  {/* Front voucher: revealed underneath, cover scratches off */}
                  <div className="relative w-[170px] h-[118px] rounded-[14px] overflow-hidden shadow-lg anim-voucher-pop">
                    {/* Revealed voucher base */}
                    <img
                      src={voucherRevealed}
                      alt="Gift voucher card number and PIN"
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                    />

                    {/* Scratchable cover (wipes left) */}
                    <div className="absolute inset-0 anim-scratch-wipe">
                      <img
                        src={voucherCover}
                        alt="Scratch to Reveal"
                        className="w-full h-full object-cover"
                        loading="eager"
                        fetchPriority="high"
                      />
                    </div>

                    {/* Sparkle finger trailing the wipe edge */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 anim-scratch-finger pointer-events-none"
                      style={{ left: "88%" }}
                    >
                      <Sparkles
                        className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Hint text */}
                <p className="text-center text-[8px] font-medium text-slate-600 pb-1">
                  Scratch to reveal your card
                </p>

                {/* Pay button */}
                <div className="px-4 pb-3">
                  <div
                    className="text-center text-white text-[10px] font-bold rounded-full py-1.5 shadow"
                    style={{
                      background:
                        "linear-gradient(135deg, #ff8a3d 0%, #ff5a1f 100%)",
                    }}
                  >
                    View Voucher
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-slate-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Floating sparkles around the phone for magical feel */}
        <Sparkles className="absolute top-12 left-10 w-5 h-5 text-amber-400 anim-twinkle" />
        <Sparkles
          className="absolute bottom-10 right-8 w-4 h-4 text-orange-400 anim-twinkle"
          style={{ animationDelay: "0.8s" }}
        />
        <Sparkles
          className="absolute top-1/2 right-6 w-4 h-4 text-amber-300 anim-twinkle"
          style={{ animationDelay: "1.6s" }}
        />
      </div>

      {/* Page indicator */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        <span className="w-6 h-1.5 rounded-full bg-primary" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
      </div>

      <div className="px-8 text-center anim-fade-up delay-200">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Buy in Seconds
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Get a smooth and secure buying experience with instant voucher
          purchases. Just scratch to reveal your gift card details — anytime,
          anywhere.
        </p>
      </div>

      <div className="flex items-center justify-between p-6 pt-8">
        <button onClick={onSkip} className="text-base font-medium text-foreground/80">
          Skip
        </button>
        <button
          onClick={onNext}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card-soft hover:scale-105 transition-transform"
          aria-label="Next"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
