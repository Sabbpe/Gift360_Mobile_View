import { Globe, Store } from "lucide-react";
import voucherRevealed from "@/assets/voucher-revealed.png";
import { StatusBar } from "./StatusBar";

interface Props {
  onBack: () => void;
  onStart: () => void;
}

/**
 * Onboarding 3 — "Instant Delivery & Redeem". The user's actual voucher
 * card sits in a phone mockup. On loop, the voucher shrinks and flies
 * into the Online (Amazon) channel, then resets and flies into the
 * Offline (Nearby Store) channel, signalling the redemption flow.
 */
export const Onboarding3 = ({ onBack, onStart }: Props) => (
  <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
    <StatusBar />

    {/* Decorative pink/peach circles */}
    <div className="absolute top-24 left-2 w-20 h-20 rounded-full bg-rose-200/70" />
    <div className="absolute top-16 left-20 w-4 h-4 rounded-full bg-rose-300" />
    <div className="absolute top-40 right-6 w-10 h-10 rounded-full bg-rose-200" />
    <div className="absolute bottom-1/3 right-0 w-16 h-16 rounded-full bg-rose-200/70" />
    <div className="absolute bottom-1/2 left-12 w-3 h-3 rounded-full bg-rose-300" />

    {/* Hero stage */}
    <div className="relative flex-1 flex items-center justify-center pt-2">
      {/* Phone mockup with voucher + redemption channels */}
      <div className="relative z-10 anim-fade-up">
        <div
          className="rounded-[32px] p-[3px] shadow-2xl"
          style={{
            background:
              "linear-gradient(160deg, #1f2937 0%, #0f172a 60%, #1f2937 100%)",
          }}
        >
          <div className="rounded-[30px] bg-black p-1.5">
            <div className="relative w-[210px] h-[360px] rounded-[26px] bg-gradient-to-b from-rose-50 via-white to-orange-50 overflow-hidden flex flex-col">
              {/* Dynamic island */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-3.5 rounded-full bg-black z-30" />

              {/* Status */}
              <div className="flex items-center justify-between px-4 pt-2 pb-1 text-[8px] font-semibold text-slate-700">
                <span>9:41</span>
                <span className="w-12" />
                <span className="opacity-70">●●●●</span>
              </div>

              {/* Header */}
              <div className="px-3 pt-3 pb-1 text-center">
                <p className="text-[10px] font-bold text-slate-800">
                  Redeem Your Voucher
                </p>
                <p className="text-[8px] text-slate-500">
                  Choose how you'd like to use it
                </p>
              </div>

              {/* Voucher: one master card splits into two — each copy
                  flies into its channel at the same time. */}
              <div className="relative flex-1 flex items-center justify-center">
                {/* Master voucher (visible at rest, fades while copies fly) */}
                <div className="absolute top-3 anim-voucher-master">
                  <div className="relative w-[170px] h-[118px] rounded-[14px] overflow-hidden shadow-lg">
                    <img
                      src={voucherRevealed}
                      alt="Gift voucher card"
                      className="w-full h-full object-cover"
                      loading="eager"
                      fetchPriority="high"
                    />
                    {/* "Use anywhere" pill */}
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-white/90 text-[7px] font-bold text-slate-700 px-1.5 py-0.5 rounded-full shadow">
                      Use Online or In-Store
                    </span>
                  </div>
                </div>

                {/* Copy that flies into the Online channel */}
                <div className="absolute top-3 anim-vanish-online pointer-events-none">
                  <div className="relative w-[170px] h-[118px] rounded-[14px] overflow-hidden shadow-lg ring-2 ring-blue-300">
                    <img
                      src={voucherRevealed}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Copy that flies into the In-Store channel */}
                <div className="absolute top-3 anim-vanish-offline pointer-events-none">
                  <div className="relative w-[170px] h-[118px] rounded-[14px] overflow-hidden shadow-lg ring-2 ring-rose-300">
                    <img
                      src={voucherRevealed}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                </div>

                {/* Comet trail dots flying with each copy */}
                <span
                  className="absolute top-12 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-400 anim-trail-online"
                  style={{ boxShadow: "0 0 10px rgba(59,130,246,0.7)" }}
                />
                <span
                  className="absolute top-12 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-400 anim-trail-offline"
                  style={{ boxShadow: "0 0 10px rgba(244,114,182,0.7)" }}
                />
              </div>

              {/* Redemption channels (online + offline) */}
              <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1">
                {/* Online channel */}
                <div className="flex flex-col items-center gap-1 bg-white rounded-xl py-2 shadow-sm border border-blue-100">
                  <div
                    className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center anim-channel-online"
                  >
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-700">
                    Redeem Online
                  </span>
                  <span className="text-[7px] text-slate-500 -mt-0.5">
                    Amazon, Myntra…
                  </span>
                </div>
                {/* Offline channel */}
                <div className="flex flex-col items-center gap-1 bg-white rounded-xl py-2 shadow-sm border border-rose-100">
                  <div
                    className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center anim-channel-offline"
                  >
                    <Store className="w-5 h-5 text-rose-500" />
                  </div>
                  <span className="text-[8px] font-bold text-slate-700">
                    In-Store
                  </span>
                  <span className="text-[7px] text-slate-500 -mt-0.5">
                    Nearby outlets
                  </span>
                </div>
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-slate-300" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Page indicator */}
    <div className="flex items-center justify-center gap-1.5 pb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
      <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
      <span className="w-6 h-1.5 rounded-full bg-primary" />
    </div>

    {/* Copy */}
    <div className="px-8 text-center anim-fade-up delay-200">
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Instant Delivery & Redeem
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Your gift voucher arrives instantly. Redeem it online with top brands
        or at nearby stores — your choice.
      </p>
    </div>

    {/* Footer */}
    <div className="flex items-center justify-between p-6 pt-8 gap-4">
      <button onClick={onBack} className="text-base font-medium text-foreground/80">
        Back
      </button>
      <button
        onClick={onStart}
        className="flex-1 h-14 rounded-full bg-primary text-primary-foreground font-semibold text-lg shadow-card-soft hover:scale-[1.02] transition-transform"
      >
        Get Started
      </button>
    </div>
  </div>
);
