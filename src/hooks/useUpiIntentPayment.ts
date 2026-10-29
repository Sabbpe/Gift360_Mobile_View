// hooks/useUpiIntentPayment.ts
// State machine + polling for the Juspay UPI-intent flow.
// Golden rule: the client only DISPLAYS what the backend reports — it never
// decides that a payment is done.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createUpiIntent,
  fetchUpiIntentStatus,
  type UpiIntentCreateResponse,
  type UpiIntentStatusResponse,
} from "@/api/upiIntentApi";
import {
  clearPendingIntent,
  isFreshPendingIntent,
  isIOS,
  loadPendingIntent,
  openUpiApp,
  registerUpiReturnListener,
  savePendingIntent,
} from "@/lib/upiIntent";
import { isNativePlatform } from "@/lib/ios";

export type UpiIntentPhase =
  | "idle"
  | "initiating"
  | "awaiting"
  | "confirming"
  | "paid"
  | "failed"
  | "expired";

const POLL_INTERVAL_MS = 2000;

interface Options {
  orderNumber: string;
  onPaid?: (orderNumber: string) => void;
  /**
   * Whether to launch the UPI app immediately after the intent is created.
   * Android/web keep this true (unchanged behaviour). Native iOS passes false:
   * the sheet shows only detected apps and launches one only after a user tap.
   */
  autoOpen?: boolean;
}

export const useUpiIntentPayment = ({ orderNumber, onPaid, autoOpen = true }: Options) => {
  const [phase, setPhase] = useState<UpiIntentPhase>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [intent, setIntent] = useState<UpiIntentCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stoppedRef = useRef(false);
  const timerRef = useRef<number>(0);
  const phaseRef = useRef<UpiIntentPhase>("idle");

  const setPhaseSafe = useCallback((next: UpiIntentPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const applyStatus = useCallback(
    (status: UpiIntentStatusResponse): boolean => {
      if (status.paid || status.status === "SUCCESS") {
        clearPendingIntent();
        setPhaseSafe("paid");
        onPaid?.(orderNumber);
        return true;
      }
      if (status.status === "FAILED") {
        clearPendingIntent();
        setError(status.message ?? "The payment was not completed.");
        setPhaseSafe("failed");
        return true;
      }
      if (status.status === "EXPIRED") {
        clearPendingIntent();
        setError(status.message ?? "The UPI payment request expired. Please try again.");
        setPhaseSafe("expired");
        return true;
      }
      return false;
    },
    [onPaid, orderNumber, setPhaseSafe]
  );

  const pollOnce = useCallback(async (): Promise<boolean> => {
    try {
      return applyStatus(await fetchUpiIntentStatus(orderNumber));
    } catch {
      return false; // transient - keep polling
    }
  }, [applyStatus, orderNumber]);

  const schedule = useCallback(() => {
    if (stoppedRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      if (stoppedRef.current) return;
      const done = await pollOnce();
      if (done) return;
      if (phaseRef.current === "awaiting") setPhaseSafe("confirming");
      schedule();
    }, POLL_INTERVAL_MS);
  }, [pollOnce, setPhaseSafe]);

  const start = useCallback(async (): Promise<UpiIntentCreateResponse | null> => {
    if (!orderNumber) return null;
    stoppedRef.current = false;
    setError(null);
    window.clearTimeout(timerRef.current);

    const saved = loadPendingIntent();
    if (saved && saved.orderNumber === orderNumber && isFreshPendingIntent(saved)) {
      // Page reloaded mid-payment: resume polling, don't accidentally reopen
      // the UPI app (the user may be paying right now).
      const resumed: UpiIntentCreateResponse = {
        status: "SUCCESS",
        orderNumber: saved.orderNumber,
        merchantRequestId: saved.merchantRequestId,
        deeplink: saved.deeplink,
        hostUrlsForIOS: saved.hostUrlsForIOS,
        amount: saved.amount,
      };
      setIntent(resumed);
      setStartedAt(saved.startedAt);
      setPhaseSafe("awaiting");
      schedule();
      return resumed;
    }

    setPhaseSafe("initiating");
    try {
      const response = await createUpiIntent(orderNumber);
      if (!response.deeplink) {
        throw new Error(response.responseMessage || "Unable to start the UPI payment.");
      }
      setIntent(response);
      const attemptStartedAt = Date.now();
      savePendingIntent({
        orderNumber,
        merchantRequestId: response.merchantRequestId,
        deeplink: response.deeplink,
        hostUrlsForIOS: response.hostUrlsForIOS,
        amount: response.amount,
        startedAt: attemptStartedAt,
      });
      setStartedAt(attemptStartedAt);
      setPhaseSafe("awaiting");
      // iOS has no system UPI chooser: opening `upi://` would hand the payment
      // to whichever app claims it (e.g. WhatsApp). All iOS builds (native AND
      // Safari/PWA) must wait for an explicit app tap in the sheet instead.
      if (autoOpen && !isIOS()) {
        openUpiApp(response.deeplink);
      }
      schedule();
      return response;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Unable to start the UPI payment. Please try again.";
      setError(message);
      setPhaseSafe("failed");
      return null;
    }
  }, [orderNumber, schedule, setPhaseSafe, autoOpen]);

  const reopen = useCallback(
    (app?: string): boolean => {
      if (!intent?.deeplink) return false;
      return openUpiApp(intent.deeplink, intent.hostUrlsForIOS, app);
    },
    [intent]
  );

  /** One backend status check; returns the raw status so callers can react. */
  const checkNow = useCallback(async (): Promise<UpiIntentStatusResponse | null> => {
    if (stoppedRef.current) return null;
    const current = phaseRef.current;
    if (current === "paid" || current === "failed" || current === "expired") return null;
    if (current === "awaiting") setPhaseSafe("confirming");
    try {
      const status = await fetchUpiIntentStatus(orderNumber);
      applyStatus(status);
      if (phaseRef.current === "confirming") setPhaseSafe("confirming");
      return status;
    } catch {
      return null;
    }
  }, [applyStatus, orderNumber, setPhaseSafe]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return registerUpiReturnListener(() => {
      void checkNow();
    });
  }, [checkNow]);

  // Native shell: the UPI app never reports back, so resume polling whenever the
  // app becomes active again (Capacitor App plugin). Web keeps the listeners above.
  useEffect(() => {
    if (!isNativePlatform()) return;
    let cancelled = false;
    let detach: (() => void) | undefined;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const handle = await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) void checkNow();
        });
        if (cancelled) {
          void handle.remove();
        } else {
          detach = () => {
            void handle.remove();
          };
        }
      } catch {
        /* plugin not available (web build) - ignore */
      }
    })();
    return () => {
      cancelled = true;
      detach?.();
    };
  }, [checkNow]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    window.clearTimeout(timerRef.current);
  }, []);

  return { phase, intent, error, start, reopen, checkNow, stop, startedAt };
};
