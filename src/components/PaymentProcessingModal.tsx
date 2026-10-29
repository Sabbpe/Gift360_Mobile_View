// components/PaymentProcessingModal.tsx
// Shown while a UPI intent is being confirmed. It never decides the outcome:
// every state comes from the backend status (useUpiIntentPayment). Closing asks
// the backend first and then shows success / failure / "still pending".
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, Loader2, RefreshCw, X } from "lucide-react";
import type { UpiIntentPhase } from "@/hooks/useUpiIntentPayment";
import UpiQrCode from "@/components/UpiQrCode";

interface Props {
  open: boolean;
  phase: UpiIntentPhase;
  error?: string | null;
  startedAt?: number | null;
  amountLabel?: string;
  /** When paying by QR, show the code in the modal instead of the spinner. */
  qrValue?: string | null;
  /** After the user taps close, we re-check the backend; still pending -> prompt. */
  pendingPrompt: boolean;
  checking?: boolean;
  onCheckStatus: () => void;
  onKeepWaiting: () => void;
  onLeave: () => void;
  onViewOrders: () => void;
  onOtherMethods?: () => void;
  onRequestClose: () => void;
}

const formatElapsed = (startedAt?: number | null): string => {
  const seconds = startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
  const capped = Math.min(seconds, 59 * 60 + 59);
  const mm = String(Math.floor(capped / 60)).padStart(2, "0");
  const ss = String(capped % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function PaymentProcessingModal({
  open,
  phase,
  error,
  startedAt,
  amountLabel,
  qrValue,
  pendingPrompt,
  checking = false,
  onCheckStatus,
  onKeepWaiting,
  onLeave,
  onViewOrders,
  onOtherMethods,
  onRequestClose,
}: Props) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startedAt));

  useEffect(() => {
    if (!open) return;
    setElapsed(formatElapsed(startedAt));
    const timer = window.setInterval(() => setElapsed(formatElapsed(startedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [open, startedAt]);

  if (!open) return null;

  const paid = phase === "paid";
  const failed = phase === "failed" || phase === "expired";
  const waiting = !paid && !failed;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={waiting ? onRequestClose : onLeave}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payment processing"
        className="relative w-[min(100%,400px)] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_70px_rgba(33,24,74,0.28)]"
      >
        <div className="relative bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] px-5 pb-5 pt-5 text-white">
          <button
            type="button"
            onClick={waiting ? onRequestClose : onLeave}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            {paid ? "Payment done" : failed ? "Payment not completed" : "Payment in progress"}
          </p>
          <h2 className="mt-0.5 text-[18px] font-bold leading-tight">
            {paid ? "Payment successful" : failed ? "Payment failed" : "Confirming your payment"}
          </h2>
          {amountLabel && (
            <p className="mt-1 text-[12px] font-medium text-white/85">{amountLabel}</p>
          )}
        </div>

        <div className="px-5 py-5">
          {waiting && !pendingPrompt && (
            <div className="flex flex-col items-center text-center">
              <style>{`
                @keyframes upi-processing-slide {
                  0% { transform: translateX(-110%); }
                  100% { transform: translateX(340%); }
                }
                .upi-processing-bar {
                  animation: upi-processing-slide 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
              `}</style>

              {qrValue ? (
                <div className="mb-1">
                  <UpiQrCode value={qrValue} size={156} />
                </div>
              ) : (
                <div className="relative grid h-20 w-20 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#9747FF]/10" />
                  <Loader2 className="h-9 w-9 animate-spin text-[#7C3AED]" />
                </div>
              )}

              {/* Sliding gradient progress bar — the "processing" animation */}
              <div className="mt-5 w-full max-w-[280px] overflow-hidden rounded-full bg-[#EEE6FF]">
                <div className="upi-processing-bar h-[6px] w-2/5 rounded-full bg-[linear-gradient(90deg,#9747FF,#7C3AED)]" />
              </div>

              <p className="mt-3 text-[14px] font-bold text-[#3B1E78]">
                {phase === "confirming" ? "Confirming payment…" : "Payment processing"}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                {qrValue
                  ? "Scan the QR to pay — we confirm automatically."
                  : "We'll confirm the payment automatically. Keep this screen open."}
              </p>

              <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#F7F2FF] px-3 py-1.5 text-[12px] font-bold text-[#5B2B99]">
                <Clock3 className="h-3.5 w-3.5" />
                {elapsed}
              </div>

              <button
                type="button"
                onClick={onRequestClose}
                className="mt-5 h-11 w-full rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[13px] font-bold text-white active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          )}

          {waiting && pendingPrompt && (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-50 text-amber-600">
                <Clock3 className="h-7 w-7" />
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">Payment still pending</p>
              <p className="mt-1 text-xs leading-snug text-gray-500">
                We haven't received the gateway confirmation yet. If the money was debited, your order
                will update automatically — you can leave this screen safely.
              </p>
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  onClick={onCheckStatus}
                  disabled={checking}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[12px] font-bold text-white active:scale-[0.98] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                  Check status again
                </button>
                <button
                  type="button"
                  onClick={onKeepWaiting}
                  className="h-11 w-full rounded-xl border border-[#E2D9FF] text-[12px] font-bold text-[#5B2B99] active:scale-[0.98]"
                >
                  Keep waiting
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="h-10 w-full text-[11px] font-semibold text-gray-500 underline underline-offset-4"
                >
                  Leave for now — I'll check My Orders
                </button>
              </div>
            </div>
          )}

          {paid && (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <p className="mt-3 text-sm font-bold text-gray-900">Payment received</p>
              <p className="mt-1 text-xs text-gray-500">
                Your vouchers are being issued. You can track them in My Orders.
              </p>
              <button
                type="button"
                onClick={onViewOrders}
                className="mt-5 h-11 w-full rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-sm font-bold text-white active:scale-[0.98]"
              >
                View my vouchers
              </button>
            </div>
          )}

          {failed && (
            <div className="text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
                <X className="h-7 w-7" />
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">Payment not completed</p>
              <p className="mt-1 text-xs leading-snug text-gray-500">
                {error ?? "The gateway did not confirm this payment. If money was debited, it will be refunded automatically."}
              </p>
              <div className="mt-5 space-y-2">
                {onOtherMethods && (
                  <button
                    type="button"
                    onClick={onOtherMethods}
                    className="h-11 w-full rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[12px] font-bold text-white active:scale-[0.98]"
                  >
                    Pay with NetBanking / Card instead
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCheckStatus}
                  disabled={checking}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#E2D9FF] text-[12px] font-bold text-[#5B2B99] active:scale-[0.98] disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
                  Check status
                </button>
                <button
                  type="button"
                  onClick={onLeave}
                  className="h-10 w-full text-[11px] font-semibold text-gray-500 underline underline-offset-4"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
