// pages/PaymentResult.tsx - Professional Generic Payment Status
import { useEffect, useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useUpdateOrderStatus } from "@/hooks/useUpdateOrderStatus";
import { useFetchCoupons } from "@/hooks/useFetchCoupons";
import { useConfirmCoupon } from "@/hooks/useConfirmCoupon";
import { useReleaseCoupon } from "@/hooks/useReleaseCoupon";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { decrypt } from "@/utils/encryption";
import {
  normalizeMobileToE164,
} from "@/api/supercoinApi";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { fetchOrderDetails } from "@/api/orderApi";
import type { GiftcardOrderDetailsResponse } from "@/types/order";

const COUPON_RESERVATION_MAP_KEY = "couponReservationByOrder";
const SUPERCOIN_HOLD_MAP_KEY = "superCoinHoldByOrder";

type SuperCoinHoldContext = {
  merchantTransactionId: string;
  merchantWalletId: string;
  amount: number;
};

export default function PaymentResult() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const { user } = useAuthContext();
  const { addNotification } = useNotification();
  const updateStatusMutation = useUpdateOrderStatus();
  const fetchCouponsMutation = useFetchCoupons();
  const confirmCouponMutation = useConfirmCoupon();
  const releaseCouponMutation = useReleaseCoupon();

  const [loading, setLoading] = useState(true);
  const [statusUpdated, setStatusUpdated] = useState(false);
  const [orderStatusUpdateSuccess, setOrderStatusUpdateSuccess] = useState(false);
  const [couponsFetched, setCouponsFetched] = useState(false);
  const [decryptedOrderNumber, setDecryptedOrderNumber] = useState<string>("");
  const [decryptedClientId, setDecryptedClientId] = useState<string>("");
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [clientIdMismatch, setClientIdMismatch] = useState(false);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [couponLifecycleStatus, setCouponLifecycleStatus] = useState<
    "idle" | "confirming" | "confirmed" | "releasing" | "released" | "failed"
  >("idle");
  const [superCoinLifecycleStatus, setSuperCoinLifecycleStatus] = useState<
    "idle" | "cancelling" | "cancelled" | "failed"
  >("idle");
  const [orderDetails, setOrderDetails] = useState<GiftcardOrderDetailsResponse | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string | null>(null);
  
  const getReservationIdForOrder = (orderNumber: string) => {
    try {
      const raw = sessionStorage.getItem(COUPON_RESERVATION_MAP_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, string>;
      return map[orderNumber] || null;
    } catch {
      return null;
    }
  };

  const clearReservationIdForOrder = (orderNumber: string) => {
    try {
      const raw = sessionStorage.getItem(COUPON_RESERVATION_MAP_KEY);
      if (!raw) return;
      const map = JSON.parse(raw) as Record<string, string>;
      delete map[orderNumber];
      sessionStorage.setItem(COUPON_RESERVATION_MAP_KEY, JSON.stringify(map));
    } catch {
      // no-op
    }
  };

  const getSuperCoinHoldForOrder = (
    orderNumber: string
  ): SuperCoinHoldContext | null => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw) as Record<string, SuperCoinHoldContext>;
      return map[orderNumber] || null;
    } catch {
      return null;
    }
  };

  const clearSuperCoinHoldForOrder = (orderNumber: string) => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return;
      const map = JSON.parse(raw) as Record<string, SuperCoinHoldContext>;
      delete map[orderNumber];
      sessionStorage.setItem(SUPERCOIN_HOLD_MAP_KEY, JSON.stringify(map));
    } catch {
      // no-op
    }
  };

  const loadOrderDetails = async (orderNumber: string) => {
    if (!orderNumber) return;

    setOrderDetailsLoading(true);
    setOrderDetailsError(null);

    try {
      const details = await fetchOrderDetails(orderNumber);
      setOrderDetails(details);
    } catch (error: any) {
      console.error("Failed to load order details:", error);
      setOrderDetailsError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load reward details right now."
      );
    } finally {
      setOrderDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (!decryptedOrderNumber) return;
    setReservationId(getReservationIdForOrder(decryptedOrderNumber));
  }, [decryptedOrderNumber]);

  // Parse params for BOTH gateways (NTT Data & Easebuzz)
  const paymentData = useMemo(() => {
    const params = new URLSearchParams(searchParams);
    
    // NTT Data: ?txnId=ENCRYPTED (capital I)
    const nttTxnId = params.get("txnId");
    
    // Easebuzz: ?status=SUCCESS&txnid=ENCRYPTED (lowercase i)
    const easebuzzStatus = params.get("status");
    const easebuzzTxnId = params.get("txnid");
    
    const error = params.get("error");

    console.log("💳 Payment callback received:", {
      nttTxnId: nttTxnId ? "present" : "null",
      easebuzzStatus,
      easebuzzTxnId: easebuzzTxnId ? "present" : "null",
      error,
    });

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
    };
  }, [searchParams]);

  // Decrypt transaction ID and extract order number + clientId
  useEffect(() => {
    const decryptTransactionId = async () => {
      if (paymentData.encryptedTransactionId) {
        try {
          const normalizedTxnId = (paymentData.encryptedTransactionId || "").trim().replace(/ /g, "+");
          const decrypted = await decrypt(normalizedTxnId);
          if (!decrypted || !decrypted.includes("|")) {
            throw new Error("Invalid decrypted payload");
          }
          const parts = decrypted.split("|");
          const orderNumber = parts[0]?.trim() || "";
          const clientIdFromToken = parts[1]?.trim() || "";
          if (!orderNumber) {
            throw new Error("Empty order number after decryption");
          }
          setDecryptedOrderNumber(orderNumber);
          setDecryptedClientId(clientIdFromToken);
          setIsDecrypted(true); // Mark decryption as successful
          
          // Validate clientId match - compare decrypted clientId with user clientId
          if (clientIdFromToken && user?.clientId && clientIdFromToken !== user.clientId) {
            console.warn("⚠️ Client ID mismatch detected!", {
              tokenClientId: clientIdFromToken,
              userClientId: user.clientId
            });
            setClientIdMismatch(true);
          } else {
            setClientIdMismatch(false);
          }
          
          console.log("✅ Order Number:", orderNumber);
          console.log("✅ Client ID from token:", clientIdFromToken);
          console.log("✅ User Client ID:", user?.clientId);
        } catch (error) {
          console.error("❌ Decryption failed:", error);
          // Do not show encrypted txnid as order number.
          // Show order number only when decryption succeeds.
          setDecryptedOrderNumber("");
          setDecryptedClientId("");
          setIsDecrypted(false); // Mark decryption as failed
        }
      }
    };

    decryptTransactionId();
  }, [paymentData.encryptedTransactionId]);

  // Initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Update order status and fetch coupons
  // The payment result should always display regardless of auth status
  // API failures should NOT trigger redirects to login
  useEffect(() => {
    // Only update order status after decryption is complete OR if decryption failed but we have fallback data
    // This prevents race conditions where API is called before decryption finishes
    // The isDecrypted flag ensures we wait for the decryption attempt to complete
    const hasValidOrderNumber = isDecrypted || (!isDecrypted && decryptedOrderNumber);
    
    if (!loading && !statusUpdated && paymentData.encryptedTransactionId && hasValidOrderNumber) {
      const orderStatus = paymentData.status === "success" ? "PAID" : "FAILED";

      // Normalize Base64 before sending to backend (spaces from URL become +, URL-safe chars normalized)
      const normalizedEncryptedData = paymentData.encryptedTransactionId
        .trim()
        .replace(/ /g, "+")
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      // Send encrypted transaction ID to backend (do not decrypt)
      updateStatusMutation.mutate(
        {
          orderNumber: normalizedEncryptedData,
          status: orderStatus,
        },
        {
          onSuccess: (response) => {
            // Mark that status update was attempted (API call succeeded)
            setStatusUpdated(true);
            
            // Set flag to force refetch in orders page
            sessionStorage.setItem('justReturnedFromPayment', 'true');
            
            // onSuccess only runs for successful HTTP responses from the backend.
            const isUpdateSuccessful = true;
            setOrderStatusUpdateSuccess(true);
            
            console.log("📝 Order status update response:", response);
            console.log("📝 Order status update success:", isUpdateSuccessful);

            const currentReservationId =
              reservationId || getReservationIdForOrder(decryptedOrderNumber);

            if (orderStatus === "PAID") {
              addNotification({
                title: "Congratulations!",
                message: "Your voucher has been purchased successfully",
                type: "success",
                eventKey: `purchase-${decryptedOrderNumber}`,
              });

              if (currentReservationId) {
                setCouponLifecycleStatus("confirming");
                confirmCouponMutation.mutate(
                  {
                    reservationId: currentReservationId,
                    orderId: decryptedOrderNumber,
                  },
                  {
                    onSuccess: () => {
                      setCouponLifecycleStatus("confirmed");
                      clearReservationIdForOrder(decryptedOrderNumber);
                    },
                    onError: () => {
                      setCouponLifecycleStatus("failed");
                    },
                  }
                );
              }

              toast({
                title: "Order Confirmed",
                description: `Order #${decryptedOrderNumber} has been successfully placed.`,
              });

              // Use user?.clientId consistently - this is the authoritative source for orders
              // Don't rely on decryptedClientId which might be inconsistent
              const clientId = user?.clientId;
              
              console.log("🔑 Using clientId for coupon fetch:", clientId);

              // Only fetch coupons if order status was actually updated successfully
              // This prevents voucher generation when order status update fails
              if (isUpdateSuccessful && clientId && !couponsFetched && decryptedOrderNumber) {
                fetchCouponsMutation.mutate(
                  {
                    clientId: clientId,
                    orderNumber: decryptedOrderNumber,
                  },
                  {
                    onSuccess: () => {
                      setCouponsFetched(true);
                      if (decryptedOrderNumber) {
                        void loadOrderDetails(decryptedOrderNumber);
                      }
                    },
                    onError: (error: any) => {
                      const errorMessage = error.message || "Order confirmed. Vouchers will be available shortly.";
                      toast({
                        title: "Note",
                        description: errorMessage,
                        variant: "default",
                      });
                    },
                  }
                );
              } else if (!isUpdateSuccessful) {
                console.warn("⚠️ Order status update returned failure, skipping coupon generation");
                toast({
                  title: "Order Processing",
                  description: "Order is being processed. Vouchers will be available shortly.",
                  variant: "default",
                });
              }
            } else {              
              if (currentReservationId) {
                setCouponLifecycleStatus("releasing");
                releaseCouponMutation.mutate(
                  {
                    reservationId: currentReservationId,
                  },
                  {
                    onSuccess: () => {
                      setCouponLifecycleStatus("released");
                      clearReservationIdForOrder(decryptedOrderNumber);
                    },
                    onError: () => {
                      setCouponLifecycleStatus("failed");
                    },
                  }
                );
              }

              const currentSuperCoinHold = getSuperCoinHoldForOrder(decryptedOrderNumber);
              if (currentSuperCoinHold) {
                setSuperCoinLifecycleStatus("cancelled");
                clearSuperCoinHoldForOrder(decryptedOrderNumber);
              }
            }
          },
          onError: (error: any) => {
            // Don't show session expired dialog for payment result page
            // Just show the payment result without updating status
            console.warn("Order status update failed:", error);
            setStatusUpdated(true); // Mark as updated to prevent retry
            setOrderStatusUpdateSuccess(false); // Mark as failed
            
            if (paymentData.status === "success") {
              toast({
                title: "Payment Successful",
                description: "Order is being processed. Check your orders for status.",
                variant: "default",
              });
            }
          },
        }
      );
    } else if (!loading && !paymentData.encryptedTransactionId) {
      toast({
        title: "Error",
        description: "Transaction information missing. Please contact support.",
        variant: "destructive",
      });
    }
  }, [
    loading,
    statusUpdated,
    paymentData.encryptedTransactionId,
    paymentData.status,
    decryptedOrderNumber,
    decryptedClientId,
    couponsFetched,
    isDecrypted,
    user?.clientId,
    orderStatusUpdateSuccess,
    reservationId,
  ]);

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
                  <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Payment Successful</span>
                    </div>
                    {reservationId && (
                      <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>
                          {couponLifecycleStatus === "confirming"
                            ? "Coupon confirmation in progress"
                            : couponLifecycleStatus === "confirmed"
                            ? "Coupon Applied"
                            : "Coupon confirmation pending"}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Order Confirmed</span>
                    </div>
                  </div>
                )}

                {paymentData.status !== "success" && (
                  <div className="space-y-2">
                    {superCoinLifecycleStatus !== "idle" && (
                      <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 space-y-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                          {superCoinLifecycleStatus === "cancelling"
                            ? "Cancelling SuperCoin hold..."
                            : superCoinLifecycleStatus === "cancelled"
                            ? "SuperCoin hold released"
                            : "SuperCoin hold cleanup failed"}
                        </p>
                      </div>
                    )}
                    {reservationId && (
                      <div className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 space-y-1">
                        <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">
                          Payment failed/cancelled. Coupon has been released.
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-400">
                          {couponLifecycleStatus === "releasing"
                            ? "Releasing coupon reservation..."
                            : couponLifecycleStatus === "released"
                            ? "Coupon unlocked. You can retry payment now."
                            : "You can retry payment from cart."}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {paymentData.status === "success" && (
                  <div className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300 font-medium">
                      <img src={superCoinIcon} alt="" className="h-4 w-4" />
                      <span>SuperCoin Reward</span>
                    </div>
                    {orderDetailsLoading ? (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Fetching earned coins...
                      </p>
                    ) : orderDetails?.coinsEarned !== null &&
                      orderDetails?.coinsEarned !== undefined ? (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        You earned {orderDetails.coinsEarned} SuperCoins for this order.
                      </p>
                    ) : orderDetailsError ? (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        {orderDetailsError}
                      </p>
                    ) : (
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        SuperCoins earned will appear here once the order is processed.
                      </p>
                    )}
                  </div>
                )}

                <div className="text-sm">
                  <div className="p-3 rounded-lg bg-background border">
                    <p className="text-muted-foreground mb-1">Status</p>
                    <p className="font-semibold">{statusLabel}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Processing Status Indicators */}
            {!loading && paymentData.encryptedTransactionId && (
              <div className="space-y-3 pt-2">
                {/* Order Status Update */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  {updateStatusMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">
                        Confirming order...
                      </span>
                    </>
                  ) : statusUpdated && paymentData.status === "success" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                      <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                        Order confirmed
                      </span>
                    </>
                  ) : updateStatusMutation.isError ? (
                    <>
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-700 dark:text-red-400">
                        Status update pending
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Voucher Generation Status */}
                {statusUpdated && paymentData.status === "success" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {fetchCouponsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          Generating vouchers...
                        </span>
                      </>
                    ) : couponsFetched ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
                        <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                          Vouchers sent to your email
                        </span>
                      </>
                    ) : fetchCouponsMutation.isError ? (
                      <>
                        <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0" />
                        <span className="text-sm text-yellow-700 dark:text-yellow-400">
                          Vouchers being processed
                        </span>
                      </>
                    ) : null}
                  </div>
                )}
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

      <Footer />
    </div>
  );
}
