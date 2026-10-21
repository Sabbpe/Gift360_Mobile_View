// pages/PaymentResult.tsx - Professional Generic Payment Status (READ-ONLY)
//
// This page is intentionally READ-ONLY: it never mutates order state and never
// triggers voucher generation. Fulfilment (ValueDesign / QwikGift) is driven
// exclusively by the payment callback on the backend. The frontend only reads
// the payment outcome from the redirect URL and (optionally) order details.
import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
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

export default function PaymentResult() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
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

    toast({
      title: "Payment Successful",
      description: `Order #${decryptedOrderNumber} has been confirmed. Vouchers will appear on your Orders page once issued.`,
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
