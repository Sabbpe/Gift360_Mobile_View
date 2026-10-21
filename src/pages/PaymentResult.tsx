// pages/PaymentResult.tsx - Professional Generic Payment Status (READ-ONLY)
//
// This page is intentionally READ-ONLY: it never mutates order state and never
// triggers voucher generation. Fulfilment (ValueDesign / QwikGift) is driven
// exclusively by the payment callback on the backend. The frontend only reads
// the payment outcome from the redirect URL and (optionally) order details.
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { useHideSupportFab } from "@/hooks/useHideSupportFab";
import { useLocation, useSearch } from "wouter";
import { useNotification } from "@/contexts/NotificationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { decrypt } from "@/utils/encryption";
import { fetchOrderDetails } from "@/api/orderApi";
import { resumeSession } from "@/api/sessionResumeApi";
import { useAuthContext } from "@/contexts/AuthContext";
import type { AuthUser } from "@/types/auth";
import type { GiftcardOrderDetailsResponse } from "@/types/order";
import { trackEvent } from "@/lib/analytics";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import JanmashtamiQuizModal from "@/components/JanmashtamiQuizModal";
import { registerPaymentCancellation, type QuizRewardStatus } from "@/api/rewardApi";
import { promptFeedback } from "@/components/FeedbackOrchestrator";

// ── Success view: animated reward reveal + 10s auto-redirect to the vouchers page ──
const REDIRECT_SECONDS = 10;

function useCountUp(target: number, run: boolean, ms = 1400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || !(target > 0)) {
      setValue(0);
      return;
    }
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return value;
}

const fmtReward = (n: number, final: number) =>
  final % 1 === 0 ? Math.round(n).toString() : n.toFixed(2);

interface SuccessViewProps {
  orderNumber: string;
  orderDetails: GiftcardOrderDetailsResponse | null;
  detailsLoading: boolean;
  detailsError: string | null;
  onRefresh: () => void;
  onGoVouchers: () => void;
  onContinueShopping: () => void;
}

function SuccessView({
  orderNumber,
  orderDetails,
  detailsLoading,
  detailsError,
  onRefresh,
  onGoVouchers,
  onContinueShopping,
}: SuccessViewProps) {
  useHideSupportFab(true);
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [stay, setStay] = useState(false);
  const goRef = useRef(onGoVouchers);
  goRef.current = onGoVouchers;
  const firedRef = useRef(false);
  const polledRef = useRef(0);

  const coins = Number(orderDetails?.coinsEarned ?? 0);
  const cashback = Number(orderDetails?.cashbackEarned ?? 0);
  const redeemed = Number(orderDetails?.coinsRedeemed ?? 0);
  const hasCoins = coins > 0;
  const hasCashback = cashback > 0;
  const rewardsKnown = hasCoins || hasCashback;
  const showSkeleton = !rewardsKnown && (detailsLoading || (!orderDetails && !detailsError));

  // Countdown, then go to the vouchers page.
  useEffect(() => {
    if (stay) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [stay]);

  useEffect(() => {
    if (secondsLeft === 0 && !stay && !firedRef.current) {
      firedRef.current = true;
      goRef.current();
    }
  }, [secondsLeft, stay]);

  // Rewards are credited by the payment callback, which can land a moment after the
  // redirect. Re-read the order a couple of times (read-only) if nothing shows yet.
  useEffect(() => {
    if (rewardsKnown || detailsLoading || stay || polledRef.current >= 3) return;
    const t = window.setTimeout(() => {
      polledRef.current += 1;
      onRefresh();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [rewardsKnown, detailsLoading, stay, orderDetails, onRefresh]);

  const coinsShown = useCountUp(coins, hasCoins);
  const cashbackShown = useCountUp(cashback, hasCashback);

  // One burst of confetti when a reward is first revealed.
  const burstRef = useRef(false);
  useEffect(() => {
    if (!rewardsKnown || burstRef.current) return;
    burstRef.current = true;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const fire = (originX: number) =>
      confetti({
        particleCount: 60,
        spread: 70,
        startVelocity: 38,
        scalar: 0.9,
        origin: { x: originX, y: 0.45 },
        colors: ["#7C3AED", "#FBBF24", "#34D399", "#FFFFFF"],
        ticks: 160,
      });
    fire(0.3);
    window.setTimeout(() => fire(0.7), 180);
  }, [rewardsKnown]);

  const ringLen = 2 * Math.PI * 18;

  return (
    <main className="flex flex-1 items-start justify-center px-4 pb-8 pt-5 sm:pt-12">
      <style>{`
        @keyframes pr-draw { to { stroke-dashoffset: 0; } }
        @keyframes pr-pop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
        @keyframes pr-ring { 0% { transform: scale(1); opacity: .45; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes pr-rise { from { transform: translateY(18px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pr-spin { 0% { transform: rotateY(0deg) scale(.5); opacity: 0; } 60% { transform: rotateY(540deg) scale(1.15); opacity: 1; } 100% { transform: rotateY(720deg) scale(1); } }
        @keyframes pr-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes pr-shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
        .pr-badge { animation: pr-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
        .pr-ring { animation: pr-ring 1.6s ease-out .3s infinite; }
        .pr-check { stroke-dasharray: 48; stroke-dashoffset: 48; animation: pr-draw .5s ease-out .35s forwards; }
        .pr-rise { animation: pr-rise .55s ease-out both; }
        .pr-coin { animation: pr-spin 1s ease-out .2s both, pr-float 2.4s ease-in-out 1.2s infinite; }
        .pr-skel { background: linear-gradient(90deg,#ede9fe 0%,#f5f3ff 50%,#ede9fe 100%); background-size: 400px 100%; animation: pr-shimmer 1.2s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .pr-badge,.pr-ring,.pr-check,.pr-rise,.pr-coin,.pr-skel { animation: none !important; stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>

      <div className="w-full max-w-[420px] text-center">
        {/* Animated check */}
        <div className="relative mx-auto mb-4 h-[72px] w-[72px]">
          <span className="pr-ring absolute inset-0 rounded-full bg-emerald-400" />
          <div className="pr-badge relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_10px_30px_rgba(16,185,129,0.4)]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path className="pr-check" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
        </div>

        <h1 className="pr-rise text-2xl font-extrabold text-[#1F1B3A]" style={{ animationDelay: ".4s" }}>
          Payment successful
        </h1>
        <p className="pr-rise mt-1 text-sm text-[#6B7280]" style={{ animationDelay: ".5s" }}>
          Your vouchers are being issued{orderNumber ? ` · Order #${orderNumber}` : ""}
        </p>

        {/* Reward reveal */}
        <div className="mt-5 space-y-3" aria-live="polite">
          {showSkeleton && (
            <div className="pr-rise flex items-center gap-4 rounded-3xl border border-violet-100 bg-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(108,92,231,0.12)]" style={{ animationDelay: ".6s" }}>
              <div className="pr-skel h-14 w-14 shrink-0 rounded-full" />
              <div className="flex-1">
                <div className="pr-skel h-3 w-20 rounded-full" />
                <div className="pr-skel mt-2 h-7 w-40 rounded-lg" />
                <p className="mt-1.5 text-xs text-[#6B7280]">Counting your rewards…</p>
              </div>
            </div>
          )}

          {hasCoins && (
            <div className="pr-rise flex items-center gap-4 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(108,92,231,0.16)]" style={{ animationDelay: ".6s" }}>
              <img src={superCoinIcon} alt="" className="pr-coin h-14 w-14 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">You earned</p>
                <p className="text-3xl font-extrabold leading-tight tabular-nums text-[#7C3AED]">
                  +{fmtReward(coinsShown, coins)} <span className="text-lg">SuperCoins</span>
                </p>
                <p className="text-xs text-[#6B7280]">Added to your Flipkart SuperCoin account</p>
              </div>
            </div>
          )}

          {hasCashback && (
            <div className="pr-rise flex items-center gap-4 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-4 py-3 text-left shadow-[0_12px_32px_rgba(16,185,129,0.14)]" style={{ animationDelay: hasCoins ? ".9s" : ".6s" }}>
              <div className="pr-coin flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-3xl">💰</div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">You earned</p>
                <p className="text-3xl font-extrabold leading-tight tabular-nums text-emerald-600">
                  +{fmtReward(cashbackShown, cashback)} <span className="text-lg">cashback points</span>
                </p>
                <p className="text-xs text-[#6B7280]">1 point = ₹1 · already in your wallet</p>
              </div>
            </div>
          )}

          {!showSkeleton && !rewardsKnown && (
            <div className="pr-rise rounded-3xl border border-violet-100 bg-white p-5 text-sm text-[#6B7280] shadow-[0_12px_32px_rgba(108,92,231,0.1)]" style={{ animationDelay: ".6s" }}>
              Any rewards from this order will show in your wallet once it is processed.
            </div>
          )}

          {redeemed > 0 && (
            <p className="pr-rise flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-700" style={{ animationDelay: "1s" }}>
              <img src={superCoinIcon} alt="" className="h-4 w-4" />
              You used {Math.round(redeemed)} SuperCoins on this order
            </p>
          )}
        </div>

        {/* Redirect */}
        <div className="pr-rise mt-5" style={{ animationDelay: "1.1s" }}>
          {!stay ? (
            <div className="flex items-center justify-center gap-3">
              <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#E9D5FF" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={ringLen}
                  strokeDashoffset={ringLen * (1 - secondsLeft / REDIRECT_SECONDS)}
                  transform="rotate(-90 22 22)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
                <text x="22" y="27" textAnchor="middle" fontSize="14" fontWeight="700" fill="#4C1D95">
                  {secondsLeft}
                </text>
              </svg>
              <p className="text-left text-sm text-[#4B5563]">
                Taking you to your
                <br />
                vouchers in {secondsLeft}s
              </p>
            </div>
          ) : (
            <p className="text-sm text-[#4B5563]">Your vouchers will appear on the Orders page once issued.</p>
          )}

          <button
            type="button"
            onClick={onGoVouchers}
            className="mx-auto mt-3 flex h-12 min-w-[220px] items-center justify-center rounded-full bg-gradient-to-r from-[#7B61FF] to-[#5B3FFF] px-8 text-base font-bold text-white shadow-lg shadow-[rgba(108,92,231,0.3)] transition-all active:scale-[0.97]"
          >
            View my vouchers
          </button>

          <div className="mt-3 flex items-center justify-center gap-5 text-sm font-semibold text-[#5B3FFF]">
            <button type="button" onClick={onContinueShopping} className="min-h-[44px] px-1">
              Continue shopping
            </button>
            {!stay && (
              <button type="button" onClick={() => setStay(true)} className="min-h-[44px] px-1 text-[#6B7280]">
                Stay here
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PaymentResult() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { addNotification } = useNotification();
  const { setUser } = useAuthContext();

  const [loading, setLoading] = useState(true);
  const [decryptedOrderNumber, setDecryptedOrderNumber] = useState<string>("");
  const [orderDetails, setOrderDetails] = useState<GiftcardOrderDetailsResponse | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  const [calloutLoading, setCalloutLoading] = useState(false);
  const [calloutReward, setCalloutReward] = useState<QuizRewardStatus | null>(null);
  const [calloutSecondsLeft, setCalloutSecondsLeft] = useState(0);
  const [quizOpen, setQuizOpen] = useState(false);
  const purchaseTrackedRef = useRef(false);
  const cancellationCalloutAttemptedRef = useRef(false);
  const resumeAttemptedRef = useRef(false);
  const resumePromiseRef = useRef<Promise<void> | null>(null);

  const loadOrderDetails = async (orderNumber: string): Promise<GiftcardOrderDetailsResponse | null> => {
    if (!orderNumber) return null;
    setOrderDetailsLoading(true);
    setOrderDetailsError(null);
    try {
      const details = await fetchOrderDetails(orderNumber);
      setOrderDetails(details);
      return details;
    } catch (error: any) {
      console.error("Failed to load order details:", error);
      setOrderDetailsError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load reward details right now."
      );
      return null;
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  // Parse params for BOTH gateways (NTT Data & Easebuzz)
  const paymentData = useMemo(() => {
    const params = new URLSearchParams(searchParams);

    // NTT Data: ?txnId=ENCRYPTED (capital I)
    const nttTxnId = params.get("txnId");

    // Easebuzz: ?status=SUCCESS&txnid=ENCRYPTED (lowercase i)
    const easebuzzStatus = params.get("status");
    const easebuzzTxnId = params.get("txnid");

    const error = params.get("error");

    let status: "success" | "error" | "pending" = "error";
    let message = "";
    let encryptedTransactionId = "";
    let gateway: "ntt" | "easebuzz" = "ntt";

    // Easebuzz detection (has both status + txnid)
    if (easebuzzStatus && easebuzzTxnId) {
      gateway = "easebuzz";
      encryptedTransactionId = easebuzzTxnId;

      const statusLower = easebuzzStatus.toLowerCase();

      if (statusLower === "success") {
        status = "success";
        message = "Your payment has been processed successfully!";
      } else if (statusLower === "failure") {
        status = "error";
        message = "Payment could not be processed. Please try again.";
      } else if (statusLower === "usercancelled") {
        status = "error";
        message = "Payment was cancelled. You have not been charged.";
      } else if (statusLower === "pending") {
        status = "pending";
        message = "Your payment is being processed. This may take a few moments.";
      } else {
        status = "error";
        message = "Payment status could not be determined.";
      }
    }
    // NTT Data detection (only txnId with capital I)
    else if (nttTxnId) {
      gateway = "ntt";
      encryptedTransactionId = nttTxnId;
      status = "success";
      message = "Your payment has been processed successfully!";
    }
    // Error parameter
    else if (error) {
      status = "error";
      switch (error) {
        case "invalid_signature":
          message = "Payment verification failed. Please contact support.";
          break;
        case "invalid_transaction":
          message = "Invalid transaction. Please try again.";
          break;
        case "txn_not_found":
          message = "Transaction not found. Please contact support.";
          break;
        case "callback_processing_failed":
          message = "Payment processing error. Please contact support.";
          break;
        default:
          message = "Payment could not be completed. Please try again.";
      }
    }
    // No valid params
    else {
      status = "error";
      message = "Invalid payment response. Please contact support.";
    }

    return {
      status,
      message,
      encryptedTransactionId,
      gateway,
      wasCancelled: gateway === "easebuzz" && easebuzzStatus?.toLowerCase() === "usercancelled",
    };
  }, [searchParams]);

  // Payment cancelled by the customer: offer the feedback form shortly after
  // the result page renders (the orchestrator applies cooldowns/limits).
  useEffect(() => {
    if (!paymentData.wasCancelled) return;
    const t = setTimeout(() => promptFeedback("payment-cancelled"), 2000);
    return () => clearTimeout(t);
  }, [paymentData.wasCancelled]);

  // Restore the customer's existing session from the encrypted order reference
  // (`txnid`) in the return URL. This does NOT depend on browser storage, so it
  // works even when the page loads in a different/empty browser context (e.g.
  // Google Pay's in-app browser after a UPI hand-off). Never logs the user out:
  // any failure (400/404/409/410, or the endpoint not deployed yet) is ignored
  // and the page stays read-only.
  const resumeSessionForReturn = async (): Promise<void> => {
    const txnid = (paymentData.encryptedTransactionId || "").trim().replace(/ /g, "+");
    if (!txnid) return;
    try {
      const session = await resumeSession(txnid);
      if (session?.token && session?.userInfo) {
        const authUser: AuthUser = {
          name: session.userInfo.name || "",
          email: session.userInfo.email || "",
          mobile: session.userInfo.mobile || "",
          token: session.token,
          clientId: session.userInfo.clientId,
        };
        // Persist immediately (before React state flush) so the request
        // interceptor attaches the Bearer token on the order-details call that
        // follows.
        localStorage.setItem("authUser", JSON.stringify(authUser));
        setUser(authUser);
        console.log("[session] restored on payment return", { clientId: authUser.clientId });
      }
    } catch (err) {
      console.warn("[session] resume skipped/unavailable (continuing read-only)", err);
    }
  };

  // Kick off session restore once, as soon as the txnid is known.
  useEffect(() => {
    if (!paymentData.encryptedTransactionId || resumeAttemptedRef.current) return;
    resumeAttemptedRef.current = true;
    resumePromiseRef.current = resumeSessionForReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentData.encryptedTransactionId]);

  // The payment return is the source of truth for making the offer visible.
  // The backend also verifies ownership and that the order is still PENDING.
  useEffect(() => {
    if (loading || !paymentData.wasCancelled || !decryptedOrderNumber || cancellationCalloutAttemptedRef.current) return;
    cancellationCalloutAttemptedRef.current = true;

    void (async () => {
      setCalloutLoading(true);
      try {
        if (resumePromiseRef.current) await resumePromiseRef.current;
        const storedUser = localStorage.getItem("authUser");
        const clientId = storedUser ? (JSON.parse(storedUser) as AuthUser).clientId : undefined;
        if (!clientId) return;

        const details = await loadOrderDetails(decryptedOrderNumber);
        if (!details || details.status?.toUpperCase() !== "PENDING") return;

        const reward = await registerPaymentCancellation(clientId, decryptedOrderNumber);
        setCalloutReward(reward);
      } catch (error) {
        console.warn("Could not open payment-cancel quiz callout", error);
      } finally {
        setCalloutLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paymentData.wasCancelled, decryptedOrderNumber]);

  useEffect(() => {
    const deadline = calloutReward?.quizStartExpiresAt;
    if (!deadline) return;
    const tick = () => setCalloutSecondsLeft(Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [calloutReward?.quizStartExpiresAt]);

  // Decrypt transaction ID and extract the order number (read-only).
  useEffect(() => {
    const decryptTransactionId = async () => {
      if (!paymentData.encryptedTransactionId) return;
      try {
        const normalizedTxnId = (paymentData.encryptedTransactionId || "").trim().replace(/ /g, "+");
        const decrypted = await decrypt(normalizedTxnId);
        if (!decrypted || !decrypted.includes("|")) {
          throw new Error("Invalid decrypted payload");
        }
        const parts = decrypted.split("|");
        const orderNumber = parts[0]?.trim() || "";
        if (!orderNumber) {
          throw new Error("Empty order number after decryption");
        }
        setDecryptedOrderNumber(orderNumber);
        console.log("✅ Order Number:", orderNumber);
      } catch (error) {
        console.error("❌ Decryption failed:", error);
        setDecryptedOrderNumber("");
      }
    };

    decryptTransactionId();
  }, [paymentData.encryptedTransactionId]);

  // Initial loading spinner
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Read-only success handling: notify + analytics + load order details once.
  // No order-status update, no coupons fetch, no reservation confirm/release.
  useEffect(() => {
    if (loading || paymentData.status !== "success" || !decryptedOrderNumber) return;

    sessionStorage.setItem("justReturnedFromPayment", "true");

    if (purchaseTrackedRef.current) return;
    purchaseTrackedRef.current = true;

    addNotification({
      title: "Congratulations!",
      message: "Your voucher has been purchased successfully",
      type: "success",
      eventKey: `purchase-${decryptedOrderNumber}`,
    });

    trackEvent("purchase", {
      transaction_id: decryptedOrderNumber,
      currency: "INR",
    });

    // Ensure the session restore has completed before loading the order, so the
    // request carries the restored Bearer token (avoids a token-less 401).
    void (async () => {
      if (resumePromiseRef.current) {
        try {
          await resumePromiseRef.current;
        } catch {
          /* ignore — read-only fallback */
        }
      }
      await loadOrderDetails(decryptedOrderNumber);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, paymentData.status, decryptedOrderNumber]);

  // Quiet re-read of the order (no loading flicker) for late-credited rewards.
  const refreshOrderQuiet = useCallback(() => {
    if (!decryptedOrderNumber) return;
    fetchOrderDetails(decryptedOrderNumber)
      .then((d) => setOrderDetails(d))
      .catch(() => undefined);
  }, [decryptedOrderNumber]);

  const goToVouchers = () => {
    sessionStorage.setItem("justReturnedFromPayment", "true");
    setLocation("/orders");
  };

  // Status UI helpers
  const getStatusIcon = () => {
    if (loading) {
      return <Loader2 className="h-20 w-20 text-amber-300 animate-spin" />;
    }
    switch (paymentData.status) {
      case "success":
        return (
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 rounded-full animate-pulse" />
            <CheckCircle2 className="h-20 w-20 text-green-400 relative z-10" />
          </div>
        );
      case "pending":
        return <Clock className="h-20 w-20 text-yellow-400" />;
      case "error":
      default:
        return <XCircle className="h-20 w-20 text-red-400" />;
    }
  };

  const getStatusTitle = () => {
    if (loading) return "Processing...";
    switch (paymentData.status) {
      case "success":
        return "Payment Successful";
      case "pending":
        return "Payment Pending";
      case "error":
      default:
        return "Payment Failed";
    }
  };

  const getStatusColor = () => {
    switch (paymentData.status) {
      case "success":
        return "text-green-400";
      case "pending":
        return "text-yellow-400";
      case "error":
      default:
        return "text-red-400";
    }
  };

  const statusLabel =
    paymentData.status === "success"
      ? "SUCCESS"
      : paymentData.status === "pending"
      ? "PENDING"
      : "FAILED";

  if (!loading && paymentData.status === "success") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(179.75deg, #9747FF -117.65%, #FFFFFF 99.79%)' }}>
        <Header />
        <SuccessView
          orderNumber={decryptedOrderNumber}
          orderDetails={orderDetails}
          detailsLoading={orderDetailsLoading}
          detailsError={orderDetailsError}
          onRefresh={refreshOrderQuiet}
          onGoVouchers={goToVouchers}
          onContinueShopping={() => setLocation("/")}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(179.75deg, #9747FF -117.65%, #FFFFFF 99.79%)' }}>
      <Header />

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-12 sm:py-16 flex items-center justify-center">
        <Card className="w-full shadow-xl border-2">
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-6">
              {getStatusIcon()}
            </div>

            <CardTitle className={`text-2xl sm:text-3xl font-bold mb-2 ${getStatusColor()}`}>
              {getStatusTitle()}
            </CardTitle>

            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              {paymentData.message}
            </p>
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {!loading && (
              <div className="p-5 rounded-xl border bg-muted/20 space-y-4">
                {paymentData.status === "success" && (
                  <div className="p-3 rounded-lg border bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.25)] space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#7C3AED] font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Payment Successful</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[#7C3AED] font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Order Confirmed</span>
                    </div>
                    <p className="text-xs text-[#7C3AED]">
                      Your vouchers will be issued shortly and will appear on your Orders page.
                    </p>
                  </div>
                )}

                {paymentData.status !== "success" && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 space-y-1">
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                        {paymentData.status === "pending"
                          ? "Your payment is being confirmed. This page will not modify your order."
                          : "Payment was not completed. You can retry from the cart."}
                      </p>
                    </div>
                  </div>
                )}

                {paymentData.wasCancelled && calloutLoading && (
                  <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm font-medium text-orange-900">
                    <Loader2 className="h-4 w-4 animate-spin" /> Preparing your Dussehra quiz offer…
                  </div>
                )}

                {paymentData.wasCancelled && calloutReward && (
                  <div className="rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
                    {calloutReward.status === "AVAILABLE" || calloutReward.status === "IN_PROGRESS" ? (
                      <>
                        <p className="text-sm font-bold text-orange-950">
                          Payment cancelled? Play a quick Dussehra quiz and earn 5 SuperCoins!
                        </p>
                        <p className="mt-1 text-xs text-orange-900">
                          Start and finish within {Math.floor(calloutSecondsLeft / 60)}:{String(calloutSecondsLeft % 60).padStart(2, "0")}.
                        </p>
                        <Button
                          size="sm"
                          className="mt-3 bg-orange-600 font-semibold text-white hover:bg-orange-700"
                          disabled={calloutSecondsLeft <= 0 || !calloutReward.publicId}
                          onClick={() => setQuizOpen(true)}
                        >
                          Play Dussehra Quiz
                        </Button>
                      </>
                    ) : calloutReward.status === "PENDING" ? (
                      <p className="text-sm font-semibold text-orange-950">
                        Quiz won! Complete a new purchase within five minutes to receive 5 bonus SuperCoins after payment and voucher fulfillment.
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-orange-900">
                        This Dussehra quiz offer has expired or is no longer available.
                      </p>
                    )}
                  </div>
                )}

                {paymentData.status === "success" &&
                  (orderDetailsLoading ||
                    (orderDetails?.coinsRedeemed !== null &&
                      orderDetails?.coinsRedeemed !== undefined &&
                      orderDetails.coinsRedeemed > 0)) && (
                  <div className="p-3 rounded-lg border bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.25)] space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#7C3AED] font-medium">
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                      <span>SuperCoin Reward</span>
                    </div>
                    {orderDetailsLoading ? (
                      <p className="text-sm text-[#7C3AED]">Fetching earned coins...</p>
                    ) : orderDetails?.coinsEarned !== null &&
                      orderDetails?.coinsEarned !== undefined ? (
                      <p className="text-sm text-[#7C3AED]">
                        You earned {orderDetails.coinsEarned} SuperCoins for this order.
                      </p>
                    ) : orderDetailsError ? (
                      <p className="text-sm text-[#7C3AED]">{orderDetailsError}</p>
                    ) : (
                      <p className="text-sm text-[#7C3AED]">
                        SuperCoins earned will appear here once the order is processed.
                      </p>
                    )}
                  </div>
                )}

                {paymentData.status === "success" &&
                  (orderDetailsLoading ||
                    (orderDetails?.cashbackEarned !== null &&
                      orderDetails?.cashbackEarned !== undefined)) && (
                  <div className="p-3 rounded-lg border bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.25)] space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[#16A34A] font-medium">
                      <span>💰</span>
                      <span>Cashback Reward</span>
                    </div>
                    {orderDetailsLoading ? (
                      <p className="text-sm text-[#16A34A]">Fetching earned cashback...</p>
                    ) : (
                      <p className="text-sm text-[#16A34A]">
                        You earned ₹{orderDetails?.cashbackEarned} cashback for this order.
                        It's already in your wallet.
                      </p>
                    )}
                  </div>
                )}

                <div className="text-sm">
                  <div className="p-3 rounded-lg bg-[rgba(151,71,255,0.04)] border border-[rgba(151,71,255,0.2)]">
                    <p className="text-[#7C3AED] mb-1">Status</p>
                    <p className="font-semibold">{statusLabel}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Warning */}
            {!loading && !paymentData.encryptedTransactionId && (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                  ⚠️ Transaction details unavailable. Please contact support with your payment reference.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {paymentData.status === "success" ? (
                <>
                  <Button
                    size="lg"
                    className="flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                    onClick={() => {
                      sessionStorage.setItem('justReturnedFromPayment', 'true');
                      setLocation("/orders");
                    }}
                  >
                    View Orders
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() => setLocation("/")}
                  >
                    Continue Shopping
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="flex-1 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                    onClick={() => setLocation("/cart")}
                  >
                    Return to Cart
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="flex-1 h-12 text-base font-semibold"
                    onClick={() => setLocation("/")}
                  >
                    Go to Home
                  </Button>
                </>
              )}
            </div>

            {/* Support Section */}
            {paymentData.status === "error" && (
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Need assistance with your payment?
                </p>
                <a
                  href="mailto:support@sabbpe.com"
                  className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                >
                  Contact Support →
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {calloutReward?.publicId && calloutReward.quizStartExpiresAt && (
        <JanmashtamiQuizModal
          open={quizOpen}
          onClose={() => setQuizOpen(false)}
          rewardPublicId={calloutReward.publicId}
          quizStartExpiresAt={calloutReward.quizStartExpiresAt}
        />
      )}

      <Footer />
    </div>
  );
}
