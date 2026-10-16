import { useEffect, useState } from "react";
import { X, MousePointerClick, HandCoins, BadgeCheck } from "lucide-react";
import { useLocation } from "wouter";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import SuperCoinBanner from "@/components/SuperCoinBanner";
import SuperCoinGuideSheet from "@/components/SuperCoinGuideSheet";

type Props = { open: boolean; onClose: () => void };

type TabId = "brands" | "convert";

const TABS: { id: TabId; label: string }[] = [
  { id: "brands", label: "Use on Brands" },
  { id: "convert", label: "Convert Coins" },
];

const CONVERT_STEPS = [
  {
    Icon: MousePointerClick,
    title: 'Tap "Try Now"',
    text: "Open the SuperCoin E-Gift Voucher from the Try Now entry on the home screen.",
  },
  {
    Icon: HandCoins,
    title: 'Tap "Convert your SuperCoins"',
    text: "Pick an amount and hit Convert — your available SuperCoin balance shows right there.",
  },
  {
    Icon: BadgeCheck,
    title: "Enter OTP & done",
    text: "Approve with the OTP. Coins convert instantly and your SuperCoin Voucher lands in My Orders.",
  },
];

export default function SuperCoinIntroModal({ open, onClose }: Props) {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabId>("brands");
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("brands");
      setGuideOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const goTryNow = () => {
    onClose();
    setLocation("/supercoin-voucher");
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[6px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="SuperCoins guide"
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      >
        <div className="w-[min(92vw,380px)] overflow-hidden rounded-[24px] bg-[#f4f5fa] shadow-[0_24px_60px_rgba(22,22,44,0.35)]">
          <div className="flex items-center gap-2.5 bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] px-4 py-3.5">
            <img src={superCoinImg} alt="" className="h-8 w-8 object-contain" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-bold leading-tight text-white">
                SuperCoins, made simple
              </h2>
              <p className="text-[10px] text-white/70">
                Two ways to put your coins to work
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 text-white active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-2 px-4 pt-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full px-3 py-2 text-[11px] font-bold transition-colors ${
                  tab === t.id
                    ? "bg-[#7C3AED] text-white shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                    : "bg-white text-[#7C3AED] border border-[#E2D9FF]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
            {tab === "brands" ? (
              <div>
                <SuperCoinBanner onOpenGuide={() => setGuideOpen(true)} />
                <p className="mt-2 text-center text-[10px] text-gray-500">
                  Tap the card for the step-by-step walkthrough.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {CONVERT_STEPS.map((step, i) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 rounded-2xl bg-white p-3 shadow-[0_4px_12px_rgba(124,58,237,0.08)] border border-purple-50"
                  >
                    <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F3F1FE]">
                      <step.Icon className="h-5 w-5 text-[#7C3AED]" strokeWidth={2} />
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#7C3AED] text-[9px] font-extrabold text-white">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-[#151722]">{step.title}</p>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-gray-500">{step.text}</p>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={goTryNow}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-[12px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] py-2.5 text-[12px] font-bold text-white shadow-[0_6px_16px_rgba(151,71,255,0.3)] active:scale-[0.98] transition-transform"
                >
                  <img src={superCoinImg} alt="" className="h-4 w-4" />
                  Try Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <SuperCoinGuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
}
