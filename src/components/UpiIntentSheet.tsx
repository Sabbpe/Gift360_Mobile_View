// components/UpiIntentSheet.tsx
// Bottom sheet for the Juspay UPI-intent flow: start → open UPI app → poll the
// backend until it reports a terminal state. The client never marks a payment
// as paid and never builds the upi:// deeplink itself.
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import { useUpiIntentPayment } from "@/hooks/useUpiIntentPayment";
import { isIOS, openUpiApp, UPI_APPS } from "@/lib/upiIntent";

interface UpiIntentSheetProps {
  open: boolean;
  orderNumber: string;
  amountLabel?: string;
  onClose: () => void;
  onPaid?: (orderNumber: string) => void;
}

const APP_LABELS: Record<string, string> = {
  Gpay: "Google Pay",
  PhonePe: "PhonePe",
  Paytm: "Paytm",
  Cred: "CRED",
  BHIM: "BHIM",
};

export default function UpiIntentSheet({
  open,
  orderNumber,
  amountLabel,
  onClose,
  onPaid,
}: UpiIntentSheetProps) {
  const { phase, intent, error, start, reopen, checkNow, stop } = useUpiIntentPayment({
    orderNumber,
    onPaid,
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      stop();
      setCopied(false);
      return;
    }
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderNumber]);

  if (!open) return null;

  const busy = phase === "initiating" || phase === "confirming";
  const awaiting = phase === "awaiting" || phase === "confirming";
  const appKeys = Object.keys(intent?.hostUrlsForIOS ?? {}).length
    ? Object.keys(intent!.hostUrlsForIOS!)
    : [...UPI_APPS];

  const copyLink = async () => {
    if (!intent?.deeplink) return;
    try {
      await navigator.clipboard.writeText(intent.deeplink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="UPI payment"
        className="relative w-[min(100%,460px)] overflow-hidden rounded-t-[24px] bg-white shadow-[0_-16px_48px_rgba(33,24,74,0.22)] animate-[slide-up-sheet_0.3s_ease-out]"
      >
        {/* Header */}
        <div className="relative bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] px-5 pb-4 pt-4 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Pay with UPI
          </p>
          <h2 className="mt-0.5 text-[17px] font-bold leading-tight">
            {phase === "paid" ? "Payment successful" : phase === "failed" || phase === "expired" ? "Payment not completed" : "Complete payment in your UPI app"}
          </h2>
          <p className="mt-1 text-[11px] font-medium text-white/85">
            Order {orderNumber}
            {amountLabel ? ` · ${amountLabel}` : ""}
          </p>
        </div>

        <div className="px-5 pb-6 pt-5">
          {(phase === "initiating" || phase === "idle") && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#7C3AED]" />
              <p className="text-sm font-semibold text-gray-800">Starting your UPI payment…</p>
              <p className="text-xs text-gray-500">Please keep this screen open.</p>
            </div>
          )}

          {awaiting && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-[#E9DFFF] bg-[#F7F2FF] px-3 py-2.5">
                <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-[#7C3AED]" />
                <p className="text-[12px] font-medium leading-snug text-[#4C1D95]">
                  {isIOS()
                    ? "Choose your UPI app below, then come back here — we confirm the payment automatically."
                    : "Pay in the UPI app that just opened, then come back here — we confirm the payment automatically."}
                </p>
              </div>

              {isIOS() ? (
                <div className="grid grid-cols-2 gap-2">
                  {appKeys.map((app) => (
                    <button
                      key={app}
                      type="button"
                      onClick={() => reopen(app)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E2D9FF] bg-white px-3 py-2.5 text-[12px] font-bold text-[#5B2B99] shadow-sm active:scale-95"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {APP_LABELS[app] ?? app}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => reopen()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] py-3 text-sm font-bold text-white shadow-md active:scale-[0.98]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Reopen UPI app
                </button>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#7C3AED]" />
                  {phase === "confirming" ? "Confirming payment…" : "Waiting for you to finish in your UPI app"}
                </span>
                <button
                  type="button"
                  onClick={() => void checkNow()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E2D9FF] px-2 py-1 text-[10px] font-bold text-[#7C3AED] active:scale-95"
                >
                  <RefreshCw className="h-3 w-3" />
                  Check status
                </button>
              </div>

              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D9CBFF] py-2 text-[11px] font-semibold text-[#7C3AED] active:scale-[0.99]"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Payment link copied" : "Copy payment link (open in any UPI app)"}
              </button>

              <p className="text-center text-[10px] leading-snug text-gray-400">
                Do not close this screen until you see the confirmation.
              </p>
            </div>
          )}

          {phase === "paid" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <p className="text-sm font-bold text-gray-900">Payment received</p>
              <p className="text-xs text-gray-500">
                Your vouchers are being issued. You can track them in My Orders.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 w-full rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] py-3 text-sm font-bold text-white shadow-md active:scale-[0.98]"
              >
                View my vouchers
              </button>
            </div>
          )}

          {(phase === "failed" || phase === "expired") && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-[12px] font-medium leading-snug text-red-700">
                  {error ?? "The payment was not completed. You have not been charged."}
                </p>
              </div>
              {intent?.deeplink && (
                <button
                  type="button"
                  onClick={() => reopen()}
                  className="w-full rounded-xl border border-[#E2D9FF] py-2.5 text-[12px] font-bold text-[#7C3AED] active:scale-95"
                >
                  Try the payment again
                </button>
              )}
              <button
                type="button"
                onClick={() => void start()}
                className="w-full rounded-xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] py-3 text-sm font-bold text-white shadow-md active:scale-[0.98]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-gray-200 py-2.5 text-[12px] font-semibold text-gray-500 active:scale-95"
              >
                Close
              </button>
            </div>
          )}

          {busy && phase === "initiating" && (
            <p className="mt-2 text-center text-[10px] text-gray-400">Do not close this screen.</p>
          )}
        </div>
      </div>
    </div>
  );
}
