import { Loader2, ArrowRight } from "lucide-react";

type PaymentFlowSheetState = "loading" | "success";

interface PaymentFlowSheetProps {
  open: boolean;
  state: PaymentFlowSheetState;
  onViewVoucherClick?: () => void;
}

export default function PaymentFlowSheet({
  open,
  state,
  onViewVoucherClick,
}: PaymentFlowSheetProps) {
  if (!open) return null;

  const isSuccess = state === "success";

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center">
      <style>{`
        .payment-sheet-backdrop {
          background: rgba(24, 24, 39, 0.34);
          backdrop-filter: blur(2px);
        }
        .payment-sheet-panel {
          width: min(100%, 460px);
          min-height: 360px;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          padding: 18px 24px 26px;
          box-shadow: 0 -16px 48px rgba(33, 24, 74, 0.16);
          animation: payment-sheet-up 420ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          overflow: hidden;
        }
        .payment-sheet-panel.loading {
          background: linear-gradient(180deg, #E8D5F5 0%, #FFFFFF 100%);
        }
        .payment-sheet-panel.success {
          background: #FFFFFF;
          transition: background 280ms ease;
        }
        .payment-sheet-handle {
          width: 56px;
          height: 6px;
          border-radius: 999px;
          background: rgba(109, 92, 231, 0.22);
          margin: 0 auto 22px;
        }
        .payment-sheet-content {
          min-height: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .payment-sheet-spinner {
          width: 82px;
          height: 82px;
          border-radius: 999px;
          border: 6px solid rgba(108, 92, 231, 0.18);
          border-top-color: #6C5CE7;
          animation: payment-sheet-spin 0.9s linear infinite;
          box-shadow: 0 10px 30px rgba(108, 92, 231, 0.12);
        }
        .payment-sheet-loading-copy {
          margin-top: 20px;
          color: #403A64;
          font-size: 15px;
          font-weight: 600;
        }
        .payment-sheet-success-wrap {
          animation: payment-sheet-fade-in 320ms ease both;
        }
        .payment-sheet-badge {
          position: relative;
          width: 94px;
          height: 94px;
          margin: 0 auto 24px;
          border-radius: 999px;
          background: radial-gradient(circle at 30% 30%, #C7F5D8 0%, #7DDB99 100%);
          box-shadow: 0 18px 36px rgba(125, 219, 153, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .payment-sheet-badge::before {
          content: "";
          position: absolute;
          inset: 14px;
          border-radius: 999px;
          background: #F5FFF8;
        }
        .payment-sheet-check {
          position: relative;
          width: 42px;
          height: 42px;
          border-radius: 999px;
          background: #41B66E;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
        }
        .payment-sheet-confetti {
          position: absolute;
          inset: -26px;
          pointer-events: none;
        }
        .payment-sheet-dot {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          opacity: 0;
          animation: payment-sheet-burst 900ms ease-out forwards;
        }
        .payment-sheet-title {
          color: #1A1A2E;
          font-size: 24px;
          font-weight: 800;
          line-height: 1.2;
        }
        .payment-sheet-link {
          margin-top: 28px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #6C5CE7;
          text-decoration: underline;
          text-underline-offset: 4px;
          font-size: 16px;
          font-weight: 700;
          background: transparent;
          border: 0;
          cursor: pointer;
        }
        @keyframes payment-sheet-up {
          from { opacity: 0; transform: translateY(100%); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes payment-sheet-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes payment-sheet-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes payment-sheet-burst {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          15% { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1); }
        }
      `}</style>

      <div className="payment-sheet-backdrop absolute inset-0" />

      <div className={`payment-sheet-panel ${isSuccess ? "success" : "loading"} relative z-10`}>
        <div className="payment-sheet-handle" />

        <div className="payment-sheet-content">
          {!isSuccess ? (
            <>
              <div className="payment-sheet-spinner" />
              <p className="payment-sheet-loading-copy">Processing your payment...</p>
            </>
          ) : (
            <div className="payment-sheet-success-wrap">
              <div className="payment-sheet-badge">
                <div className="payment-sheet-confetti">
                  {[
                    ["-68px", "-34px", "#6C5CE7"],
                    ["-46px", "-58px", "#A29BFE"],
                    ["0px", "-72px", "#35C759"],
                    ["42px", "-56px", "#FFB020"],
                    ["70px", "-18px", "#FF6B81"],
                    ["64px", "26px", "#53B7F9"],
                    ["28px", "62px", "#7DDB99"],
                    ["-24px", "66px", "#C1A3FA"],
                    ["-66px", "26px", "#FF8A65"],
                  ].map(([dx, dy, color], index) => (
                    <span
                      key={index}
                      className="payment-sheet-dot"
                      style={
                        {
                          "--dx": dx,
                          "--dy": dy,
                          background: color,
                          animationDelay: `${index * 40}ms`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="payment-sheet-check">✓</div>
              </div>

              <h2 className="payment-sheet-title">Voucher Purchased Successfully</h2>

              <button
                type="button"
                className="payment-sheet-link"
                onClick={onViewVoucherClick}
              >
                View Voucher
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}