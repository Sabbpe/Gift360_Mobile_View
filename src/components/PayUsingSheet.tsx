// components/PayUsingSheet.tsx
// Full-screen "Pay using" chooser:
//   UPI apps (static per-app schemes on every platform) + QR -> Juspay intent
//   NetBanking / Debit / Credit                              -> Easebuzz
// Every row shows the platform fee from the DB fee table. The client never
// marks a payment as successful: the ProcessingModal only mirrors the backend.
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, CreditCard, Loader2, QrCode, Smartphone, X } from "lucide-react";
import { useUpiIntentPayment } from "@/hooks/useUpiIntentPayment";
import { useInstalledUpiApps } from "@/hooks/useInstalledUpiApps";
import { computeMethodFee } from "@/hooks/usePaymentMethodFees";
import type { PaymentMethodFee } from "@/api/brandsApi";
import { IOS_UPI_APPS, type IosUpiApp } from "@/lib/iosUpiApps";
import { isIOS, launchUrl, resolveUpiUrl } from "@/lib/upiIntent";
import { isNativeIos } from "@/lib/ios";
import { isUpiPaymentMethod } from "@/lib/paymentModes";
import { openUpiUrlNative } from "@/plugins/upi";
import UpiQrCode from "@/components/UpiQrCode";
import PaymentProcessingModal from "@/components/PaymentProcessingModal";

interface PayUsingSheetProps {
  open: boolean;
  orderNumber: string;
  /** Cash payable before the method fee (used for every fee row). */
  cashAmount: number;
  methods: PaymentMethodFee[];
  amountLabel?: string;
  onClose: () => void;
  onPaid: (orderNumber: string) => void;
  /** NetBanking / Debit / Credit -> Easebuzz (UPI is never sent there). */
  onCardMethod: (code: string) => void;
  onFallbackToOtherMethods?: (code?: string) => void;
}

const money = (value: number): string => `₹${value.toFixed(2)}`;

const APP_ACCENT: Record<string, string> = {
  Gpay: "bg-[#E8F0FE] text-[#1A73E8]",
  PhonePe: "bg-[#EFE7FF] text-[#5F259F]",
  Paytm: "bg-[#E6F6FF] text-[#00A5EC]",
  Cred: "bg-[#F1F1F4] text-[#111827]",
  BHIM: "bg-[#FFF1E6] text-[#F58220]",
};

export default function PayUsingSheet({
  open,
  orderNumber,
  cashAmount,
  methods,
  amountLabel,
  onClose,
  onPaid,
  onCardMethod,
  onFallbackToOtherMethods,
}: PayUsingSheetProps) {
  const nativeIos = isNativeIos();
  const installed = useInstalledUpiApps({ enabled: nativeIos });
  const { phase, error, start, checkNow, stop, startedAt } = useUpiIntentPayment({
    orderNumber,
    autoOpen: false,
  });

  const [processingOpen, setProcessingOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(false);
  const [checking, setChecking] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const upiMethod = methods.find((m) => isUpiPaymentMethod(m.code));
  const upiFee = upiMethod ? computeMethodFee(upiMethod, cashAmount) : null;
  const cardMethods = useMemo(
    () => methods.filter((m) => !isUpiPaymentMethod(m.code)),
    [methods]
  );
  const apps: IosUpiApp[] = nativeIos ? installed.apps : [...IOS_UPI_APPS];

  useEffect(() => {
    if (!open) {
      stop();
      setProcessingOpen(false);
      setPendingPrompt(false);
      setQrValue(null);
      setLaunchError(null);
    }
  }, [open, stop]);

  const beginIntent = useCallback(async () => {
    setLaunchError(null);
    const response = await start();
    if (!response?.deeplink) {
      setLaunchError("We couldn't start the UPI request. Please try again or pay by card.");
      return null;
    }
    setQrValue(null);
    setProcessingOpen(true);
    setPendingPrompt(false);
    return response;
  }, [start]);

  const handleApp = async (app: IosUpiApp) => {
    setQrValue(null);
    const response = await beginIntent();
    if (!response) return;
    const url = resolveUpiUrl(response.deeplink, response.hostUrlsForIOS, app.key, isIOS());
    if (!url) {
      setLaunchError(`We couldn't build a ${app.label} link. Scan the QR code instead.`);
      setProcessingOpen(false);
      return;
    }
    if (nativeIos) {
      const opened = await openUpiUrlNative(url);
      if (!opened) {
        setLaunchError(`Couldn't open ${app.label}. Try another app or scan the QR code.`);
        setProcessingOpen(false);
      }
    } else {
      launchUrl(url);
    }
  };

  const handleQr = async () => {
    const response = await beginIntent();
    if (!response) return;
    setQrValue(response.deeplink);
  };

  const handleOtherApps = async () => {
    if (isIOS()) return;
    setQrValue(null);
    const response = await beginIntent();
    if (!response) return;
    launchUrl(response.deeplink);
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      await checkNow();
    } finally {
      setChecking(false);
    }
  };

  const handleRequestClose = async () => {
    setChecking(true);
    try {
      const status = await checkNow();
      const normalized = status?.status?.toUpperCase();
      setPendingPrompt(!normalized || normalized === "PENDING");
    } finally {
      setChecking(false);
    }
  };

  const handleLeave = () => {
    setPendingPrompt(false);
    setProcessingOpen(false);
    stop();
    onClose();
  };

  const handleViewOrders = () => {
    setProcessingOpen(false);
    onPaid(orderNumber);
  };

  const handleFallback = () => {
    setProcessingOpen(false);
    onClose();
    onFallbackToOtherMethods?.();
  };

  if (!open) return null;

  const pageClose = () => {
    stop();
    onClose();
  };

  const total = (fee: number | null) =>
    fee == null ? null : money(Math.round((cashAmount + fee) * 100) / 100);

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-end justify-center">
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          onClick={pageClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pay using"
          className="relative max-h-[92vh] w-[min(100%,480px)] overflow-y-auto rounded-t-[26px] bg-white shadow-[0_-16px_48px_rgba(33,24,74,0.22)] animate-[slide-up-sheet_0.3s_ease-out]"
        >
          <div className="relative bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] px-5 pb-5 pt-4 text-white">
            <button
              type="button"
              onClick={pageClose}
              aria-label="Close"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
              Pay using
            </p>
            <h2 className="mt-0.5 text-[19px] font-bold leading-tight">
              {amountLabel ?? money(cashAmount)}
            </h2>
            <p className="mt-1 text-[11px] font-medium text-white/85">
              Platform fee is added per method. Order {orderNumber}
            </p>
          </div>

          <div className="space-y-5 px-5 pb-7 pt-5">
            {launchError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                {launchError}
              </p>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">UPI apps</p>
                {upiFee != null && (
                  <p className="text-[11px] font-semibold text-[#7C3AED]">
                    UPI fee {money(upiFee)}
                  </p>
                )}
              </div>

              {nativeIos && installed.status === "detecting" ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-[#E2D9FF] py-4 text-[12px] font-semibold text-[#5B2B99]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting UPI apps on this iPhone…
                </div>
              ) : apps.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {apps.map((app) => (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => void handleApp(app)}
                      className="flex items-center gap-2 rounded-2xl border border-[#E2D9FF] bg-white px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                          APP_ACCENT[app.key] ?? "bg-[#F7F2FF] text-[#5B2B99]"
                        }`}
                      >
                        {app.label.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-bold text-[#3B1E78]">
                          {app.label}
                        </span>
                        <span className="block text-[10px] font-semibold text-gray-500">
                          {total(upiFee) ?? "Fee at checkout"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium leading-snug text-amber-800">
                  {installed.status === "error"
                    ? "We couldn't check which UPI apps are installed. Scan the QR below or pay by card."
                    : "No UPI app was found on this iPhone. Scan the QR below or pay by card."}
                </p>
              )}

              {!isIOS() && (
                <button
                  type="button"
                  onClick={() => void handleOtherApps()}
                  className="flex w-full items-center justify-between rounded-xl border border-dashed border-[#D9CBFF] px-3 py-2.5 text-[12px] font-bold text-[#5B2B99] active:scale-[0.99]"
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Other UPI apps
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleQr()}
                className="flex w-full items-center justify-between rounded-xl border border-[#E2D9FF] bg-[#F7F2FF] px-3 py-2.5 text-[12px] font-bold text-[#5B2B99] active:scale-[0.99]"
              >
                <span className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Pay using QR
                </span>
                <span className="text-[11px] font-semibold text-[#7C3AED]">
                  {total(upiFee) ?? "Scan"}
                </span>
              </button>

              {qrValue && !processingOpen && (
                <div className="flex justify-center pt-1">
                  <UpiQrCode value={qrValue} />
                </div>
              )}
            </section>

            {cardMethods.length > 0 && (
              <section className="space-y-2">
                <p className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280]">
                  Cards & NetBanking
                </p>
                {cardMethods.map((method) => {
                  const fee = computeMethodFee(method, cashAmount);
                  return (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => onCardMethod(method.code)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-[#E2D9FF] bg-white px-3 py-3 text-left shadow-sm active:scale-[0.99]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F7F2FF] text-[#5B2B99]">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-[#3B1E78]">
                          {method.label}
                        </span>
                        <span className="block text-[10px] font-semibold text-gray-500">
                          Fee {money(fee)}
                        </span>
                      </span>
                      <span className="text-right text-[12px] font-extrabold text-[#5B2B99]">
                        {total(fee)}
                      </span>
                    </button>
                  );
                })}
              </section>
            )}

            {onFallbackToOtherMethods && (
              <button
                type="button"
                onClick={handleFallback}
                className="w-full rounded-xl border border-[#E2D9FF] bg-[#F7F2FF] py-2.5 text-[12px] font-bold text-[#5B2B99] active:scale-95"
              >
                Pay with NetBanking / Debit / Credit card instead
              </button>
            )}

            <p className="text-center text-[10px] leading-snug text-gray-400">
              UPI is processed by our UPI gateway. Cards / NetBanking are processed by Easebuzz.
            </p>
          </div>
        </div>
      </div>

      <PaymentProcessingModal
        open={processingOpen}
        phase={phase}
        error={error}
        startedAt={startedAt}
        amountLabel={amountLabel ?? money(cashAmount)}
        qrValue={qrValue}
        pendingPrompt={pendingPrompt}
        checking={checking}
        onCheckStatus={() => void handleCheck()}
        onKeepWaiting={() => setPendingPrompt(false)}
        onLeave={handleLeave}
        onViewOrders={handleViewOrders}
        onOtherMethods={onFallbackToOtherMethods ? handleFallback : undefined}
        onRequestClose={() => void handleRequestClose()}
      />
    </>
  );
}
