import { useEffect, useState } from "react";

interface AddToCartSuccessModalProps {
  open: boolean;
  onClose?: () => void;
}

type AnimationStage = 1 | 2 | 3 | 4;

const CartIcon = () => (
  <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" aria-hidden>
    <path
      d="M10 15h7l4.5 21.5a3 3 0 0 0 2.94 2.39h22.78a3 3 0 0 0 2.92-2.29L55 22H21"
      stroke="#6C5CE7"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="28" cy="49" r="4.5" fill="#6C5CE7" />
    <circle cx="47" cy="49" r="4.5" fill="#6C5CE7" />
  </svg>
);

const VoucherIcon = () => (
  <svg viewBox="0 0 90 60" className="h-full w-full" fill="none" aria-hidden>
    <rect x="4" y="8" width="82" height="44" rx="12" fill="#6C5CE7" />
    <rect x="14" y="18" width="24" height="24" rx="6" fill="rgba(255,255,255,0.18)" />
    <path
      d="M27 22l2.5 5 5.5.8-4 4 .95 5.7-4.95-2.65L22.05 37l.95-5.7-4-4 5.5-.8L27 22z"
      fill="#fff"
    />
    <rect x="46" y="20" width="28" height="4" rx="2" fill="#fff" opacity="0.92" />
    <rect x="46" y="29" width="18" height="4" rx="2" fill="#fff" opacity="0.72" />
  </svg>
);

export default function AddToCartSuccessModal({
  open,
  onClose,
}: AddToCartSuccessModalProps) {
  const [stage, setStage] = useState<AnimationStage>(1);

  useEffect(() => {
    if (!open) {
      setStage(1);
      return;
    }

    setStage(1);

    const state2Timer = window.setTimeout(() => setStage(2), 400);
    const state3Timer = window.setTimeout(() => setStage(3), 1000);
    const state4Timer = window.setTimeout(() => setStage(4), 1800);

    return () => {
      window.clearTimeout(state2Timer);
      window.clearTimeout(state3Timer);
      window.clearTimeout(state4Timer);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <style>{`
        .voucher-success-card {
          width: min(300px, calc(100vw - 32px));
          height: 280px;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 24px 60px rgba(17, 24, 39, 0.22);
          border: 1px solid rgba(108, 92, 231, 0.12);
        }
        .voucher-cart-stage {
          position: relative;
          width: 140px;
          height: 120px;
          margin: 0 auto;
        }
        .voucher-cart-shell {
          position: absolute;
          left: 50%;
          top: 42px;
          width: 78px;
          height: 78px;
          transform: translateX(-50%);
          color: #6c5ce7;
          opacity: 0;
        }
        .voucher-cart-shell.state-1 {
          opacity: 0.3;
          transform: translateX(-50%) scale(0.96);
        }
        .voucher-cart-shell.state-2 {
          opacity: 1;
          animation: cart-race-in 600ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .voucher-cart-shell.state-3 {
          opacity: 1;
          transform: translateX(-50%);
        }
        .voucher-cart-shell.state-3.impact {
          animation: cart-impact 320ms ease-out;
        }
        .voucher-cart-shell.state-4 {
          opacity: 1;
          animation: cart-exit 380ms ease-in forwards;
        }
        .voucher-streaks {
          position: absolute;
          left: 12px;
          top: 56px;
          width: 70px;
          opacity: 0;
        }
        .voucher-streaks.active {
          opacity: 1;
          animation: streak-fade 560ms ease-out forwards;
        }
        .voucher-streak {
          height: 6px;
          border-radius: 999px;
          background: #d0c9ff;
          margin-bottom: 10px;
        }
        .voucher-streak:nth-child(1) { width: 62px; }
        .voucher-streak:nth-child(2) { width: 48px; margin-left: 12px; }
        .voucher-streak:nth-child(3) { width: 34px; margin-left: 24px; margin-bottom: 0; }
        .voucher-drop {
          position: absolute;
          left: 50%;
          top: 4px;
          width: 90px;
          height: 60px;
          transform: translateX(-50%);
          opacity: 0;
        }
        .voucher-drop.active {
          opacity: 1;
          animation: voucher-drop 540ms cubic-bezier(0.2, 0.9, 0.2, 1) forwards;
        }
        .voucher-message {
          margin-top: 22px;
          text-align: center;
          color: #1a1a2e;
          font-size: 16px;
          font-weight: 700;
          line-height: 1.35;
          opacity: 0;
        }
        .voucher-message.visible {
          animation: message-fade 340ms ease-out forwards;
        }
        .voucher-message-underline {
          width: 0;
          height: 4px;
          border-radius: 999px;
          margin: 10px auto 0;
          background: #d0c9ff;
        }
        .voucher-message-underline.visible {
          animation: underline-grow 420ms ease-out forwards;
        }
        @keyframes cart-race-in {
          0% { opacity: 0; transform: translateX(calc(-50% - 120px)); }
          70% { opacity: 1; transform: translateX(calc(-50% + 10px)); }
          100% { opacity: 1; transform: translateX(-50%); }
        }
        @keyframes cart-impact {
          0% { transform: translateX(-50%) scaleX(1); }
          40% { transform: translateX(-50%) scaleX(1.1) scaleY(0.95); }
          100% { transform: translateX(-50%) scaleX(1) scaleY(1); }
        }
        @keyframes cart-exit {
          0% { opacity: 1; transform: translateX(-50%); }
          100% { opacity: 0; transform: translateX(calc(-50% + 110px)); }
        }
        @keyframes streak-fade {
          0% { opacity: 0; transform: translateX(-8px); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateX(8px); }
        }
        @keyframes voucher-drop {
          0% { opacity: 0; transform: translate(-50%, -56px) scale(0.96); }
          75% { opacity: 1; transform: translate(-50%, 38px) scale(1); }
          100% { opacity: 1; transform: translate(-50%, 34px) scale(1); }
        }
        @keyframes message-fade {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes underline-grow {
          from { width: 0; opacity: 0; }
          to { width: 132px; opacity: 1; }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="voucher-success-card relative z-10 flex flex-col justify-center">
        <div className="voucher-cart-stage">
          <div className={`voucher-streaks ${stage === 2 ? "active" : ""}`}>
            <div className="voucher-streak" />
            <div className="voucher-streak" />
            <div className="voucher-streak" />
          </div>

          <div
            className={[
              "voucher-cart-shell",
              stage === 1 ? "state-1" : "",
              stage === 2 ? "state-2" : "",
              stage === 3 ? "state-3 impact" : "",
              stage === 4 ? "state-4" : "",
            ].join(" ")}
          >
            <CartIcon />
          </div>

          <div className={`voucher-drop ${stage >= 3 ? "active" : ""}`}>
            <VoucherIcon />
          </div>
        </div>

        <div className={`voucher-message ${stage >= 3 ? "visible" : ""}`}>
          Voucher added to cart successfully!
          <div
            className={`voucher-message-underline ${stage >= 4 ? "visible" : ""}`}
          />
        </div>
      </div>
    </div>
  );
}
