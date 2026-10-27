import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Clock, Minus, Plus, Wallet } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useValidateOrder } from "@/hooks/useValidateOrder";
import { useBackendPaymentInitiation } from "@/hooks/useBackendPaymentInitiation";
import { usePaymentMethodFees, computeMethodFee } from "@/hooks/usePaymentMethodFees";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { useSuperCoinEarnEstimate } from "@/hooks/useSuperCoinEarnEstimate";
import { isSuperCoinEligible } from "@/lib/supercoin-excluded-brands";
import AddToCartSuccessModal from "@/components/AddToCartSuccessModal";
import SuperCoinOTPModal, {
  type SuperCoinHoldContext,
} from "@/components/SuperCoinOTPModal";
import SuperCoinStatusCard from "@/components/SuperCoinStatusCard";
import SuperCoinRedeemedModal from "@/components/SuperCoinRedeemedModal";
import PaymentFlowSheet from "@/components/PaymentFlowSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fetchPlatformFeeConfig } from "@/api/brandsApi";
import { fetchOrderDetails } from "@/api/orderApi";
import {
  cancelSuperCoinHold,
  fetchSuperCoinConfig,
  fetchSuperCoinBrandShares,
  normalizeMobileToE164,
  type SuperCoinIdentity,
} from "@/api/supercoinApi";
import { brandApi } from "@/lib/valuedesignApi";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import type { BrandDetailsParsed } from "@/types/brandDetails";
import { getImageUrl } from "@/utils/imageUrl";

import { useHideSupportFab } from "@/hooks/useHideSupportFab";
import { useFetchWallet } from "@/hooks/useFetchWallet";
const MAX_QUANTITY_PER_ITEM = 3;

/**
 * Item cashback value in scale-4 integer units (rupees × 10⁴), HALF_UP.
 * Same exact-arithmetic helper Cart.tsx uses so the wallet cap we compute
 * matches GiftcardOrderService.validateWalletAmount to the paisa.
 */
function itemCashbackScale4(lineTotal: number, pct: number): number {
  const lineTotalPaise = Math.round(lineTotal * 100);
  const pctBasis = Math.round(pct * 100);
  const product = lineTotalPaise * pctBasis;
  const q = Math.floor(product / 100);
  const r = product % 100;
  return r * 2 >= 100 ? q + 1 : q;
}

/** min(cashbackValue × redeemPercent/100, maxRedeemAmount) in paise — see Cart.tsx. */
function walletCapPaise(
  cashbackValueScale4: number,
  redeemPercent: number,
  maxRedeemAmount: number
): number {
  const product = cashbackValueScale4 * redeemPercent;
  const q = Math.floor(product / 10000);
  const r = product % 10000;
  const percentOfCashbackPaise = r * 2 >= 10000 ? q + 1 : q;
  const maxRedeemPaise = Math.round(maxRedeemAmount * 100);
  return Math.min(percentOfCashbackPaise, maxRedeemPaise);
}

type PayMode = "cashbackWallet" | "superCoins";

type Props = {
  brandId?: string | null;
  open: boolean;
  onClose: () => void;
  showAddToCart?: boolean;
  initialAmount?: number;
  initialQuantity?: number;
  initialBrandDetails?: BrandDetailsParsed | null;
  initialTab?: "about" | "how" | "terms" | null;
};

export default function PaymentDetailsSheet({
  brandId,
  open,
  onClose,
  showAddToCart = true,
  initialAmount,
  initialQuantity,
  initialBrandDetails,
  initialTab = null,
}: Props) {
  useHideSupportFab(open);
  const cashbackPercent = 15;
  const { data: fetchedBrand } = useBrandDetails(brandId || "", {
    enabled: !!brandId && open && !initialBrandDetails,
  });
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [amount, setAmount] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  // One info card at a time under the About / How to Use / Terms pills
  // (same as before), but open by default when the sheet opens.
  const [activeTab, setActiveTab] = useState<null | "about" | "how" | "terms">(
    null
  );
  const infoScrollRef = useRef<HTMLDivElement | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthContext();
  const { addToCart, clearCart } = useCart(user?.clientId);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const createOrderMutation = useCreateOrder();
  const validateOrderMutation = useValidateOrder();
  const backendPaymentMutation = useBackendPaymentInitiation();

  const brand = initialBrandDetails || fetchedBrand;

  const isFixedType = brand?.BrandType?.toLowerCase() === "fixed";
  const discountPercent = Number(brand?.Discount) || cashbackPercent;
  const min = Number(brand?.minPrice) || brand?.DenominationList?.[0] || 1000;
  const max =
    Number(brand?.maxPrice) ||
    brand?.DenominationList?.[brand.DenominationList.length - 1] ||
    min;

  const subtotal = amount * quantity;
  // Per-brand SuperCoin share (V51): the most of the price payable in SuperCoins in SuperCoin mode.
  // 0 = no SuperCoin mode for the brand; 1..99 = that percent; no entry = global cap + built-in exclusion list.
  const [brandShares, setBrandShares] = useState<Record<string, number>>({});
  useEffect(() => {
    fetchSuperCoinBrandShares().then(setBrandShares);
  }, []);
  const brandShare = brand ? brandShares[brand.BrandId] : undefined;
  const brandCapShare =
    typeof brandShare === "number" && brandShare > 0 && brandShare < 100 ? brandShare : null;
  const superCoinEligible = brand
    ? typeof brandShare === "number" && brandShare < 100
      ? brandShare > 0
      : isSuperCoinEligible(brand.BrandId, brand.BrandName)
    : false;

  // ---------------------------------------------------------------------------
  // Payment panel: Buy Now asks cash vs SuperCoins+Cash, then pays in-sheet.
  // The math and the SuperCoin OTP/hold flow mirror Cart.tsx exactly.
  // ---------------------------------------------------------------------------
  const [payPanelOpen, setPayPanelOpen] = useState(false);
  const [payMode, setPayMode] = useState<PayMode | null>(null);

  // Cashback-points (wallet) redemption — same hook Cart uses; the query is
  // shared/cached (["wallet", clientId]) with Header/Home, so opening this
  // sheet doesn't refire the wallet call or re-handle its auth token.
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const { data: walletData } = useFetchWallet(user?.clientId);

  // Platform-fee fallback (method fees from the DB are preferred when loaded).
  const [platformFeeConfig, setPlatformFeeConfig] = useState({
    feePercent: 1.5,
    feeMax: 30,
    feePercentCash: 1,
    feeMaxCash: 20,
  });
  useEffect(() => {
    fetchPlatformFeeConfig()
      .then(setPlatformFeeConfig)
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  // Cash payment methods (UPI / cards / ...) with per-method platform fee.
  const { methods: paymentMethods, loaded: paymentMethodsLoaded } =
    usePaymentMethodFees();
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("UPI");
  const activePaymentMethod =
    paymentMethods.find((m) => m.code === selectedPaymentMethod) ??
    paymentMethods[0];
  const useMethodFee = paymentMethodsLoaded && paymentMethods.length > 0;

  // --- SuperCoin identity + live config (same sources Cart.tsx uses) ---
  const superCoinMerchantWalletId =
    import.meta.env.VITE_SUPERCOIN_MERCHANT_WALLET_ID?.trim() || "";
  const normalizedSuperCoinMobile = useMemo(
    () => normalizeMobileToE164(user?.mobile),
    [user?.mobile]
  );
  const superCoinIdentity: SuperCoinIdentity | null =
    normalizedSuperCoinMobile
      ? { identifier: normalizedSuperCoinMobile, type: "MOBILE" }
      : null;

  const [scCapPercent, setScCapPercent] = useState(20);
  useEffect(() => {
    fetchSuperCoinConfig()
      .then((config) => {
        if (typeof config.capPercent === "number" && config.capPercent > 0) {
          setScCapPercent(config.capPercent);
        }
      })
      .catch(() => {
        /* keep fallback cap */
      });
  }, []);

  // Per-brand SuperCoin multiplier (coins per ₹1), default 1.25.
  const [scMultiplier, setScMultiplier] = useState(1.25);
  useEffect(() => {
    if (!brand?.BrandId) return;
    let cancelled = false;
    brandApi
      .post<{ supercoinMultiplier?: string | number } | null>(
        `/brands/${brand.BrandId}`,
        {}
      )
      .then((r) => {
        if (!cancelled) {
          setScMultiplier(Number(r?.data?.supercoinMultiplier) || 1.25);
        }
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, [brand?.BrandId]);

  const [scState, setScState] = useState({ eligible: false, balance: 0 });
  const [selectedSCCoins, setSelectedSCCoins] = useState(0);
  const [scPreviewOff, setScPreviewOff] = useState(false);
  const [scAuthorized, setScAuthorized] = useState(false);
  const [scHoldContext, setScHoldContext] =
    useState<SuperCoinHoldContext | null>(null);
  const scHoldContextRef = useRef<SuperCoinHoldContext | null>(null);
  const [scOTPModalOpen, setScOTPModalOpen] = useState(false);
  // Post-OTP "redeemed · continue payment in 3…2…1" countdown modal.
  const [scRedeemedOpen, setScRedeemedOpen] = useState(false);
  const [scOrderNumber, setScOrderNumber] = useState("");
  const [scCountdownDisplay, setScCountdownDisplay] = useState("");
  // Leaving SuperCoins mode while coins are on hold asks first (Cart's
  // requestSwitchToCashback / remove dialog).
  const [scRemoveConfirmOpen, setScRemoveConfirmOpen] = useState(false);
  // Cart's "Use X SuperCoins?" prompt shown before the Flipkart OTP.
  const [scPromptOpen, setScPromptOpen] = useState(false);
  // Cart's PaymentFlowSheet loading modal shown while paying.
  const [paymentFlowOpen, setPaymentFlowOpen] = useState(false);
  // UPI/netbanking chooser pops up only when Pay is pressed (not inline).
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  // Coin cap = scCapPercent of the voucher face value, in coins, using the
  // brand's own multiplier (same formula as Cart / backend initHold).
  const maxSuperCoinRedeemable = Math.ceil(
    subtotal * ((brandCapShare ?? scCapPercent) / 100) * scMultiplier
  );
  const maxSCCoins = Math.max(
    0,
    Math.min(scState.balance, maxSuperCoinRedeemable)
  );
  useEffect(() => {
    if (maxSCCoins < 1) {
      setSelectedSCCoins(0);
      return;
    }
    setSelectedSCCoins((prev) =>
      prev < 1 ? maxSCCoins : Math.min(prev, maxSCCoins)
    );
  }, [maxSCCoins]);

  const inSuperCoinMode = payMode === "superCoins";
  // Authorised hold wins; while the slider is being moved the coins are only
  // previewed (applying them needs the Flipkart OTP at Pay time).
  const superCoinDeduction =
    scAuthorized && scState.eligible
      ? Math.min(
          scHoldContext?.amount ?? scState.balance,
          maxSuperCoinRedeemable,
          scState.balance
        ) / scMultiplier
      : 0;
  const scPreviewDeduction =
    inSuperCoinMode &&
    !scAuthorized &&
    !scPreviewOff &&
    scState.eligible &&
    maxSCCoins >= 1 &&
    selectedSCCoins >= 1
      ? Math.min(
          Math.min(selectedSCCoins, maxSCCoins) / scMultiplier,
          Math.max(0, subtotal)
        )
      : 0;
  const displaySCDeduction =
    superCoinDeduction > 0 ? superCoinDeduction : scPreviewDeduction;

  // Cashback-points cap, mirroring Cart: min(cashbackValue × redeem% ,
  // maxRedeemAmount) with exact integer math so it agrees with the backend's
  // strict validateWalletAmount check at order creation.
  const walletBalance = walletData?.totalBalance || 0;
  const cashbackRedeemPercent = walletData?.cashbackRedeemPercent ?? 50;
  const maxRedeemAmount = walletData?.maxRedeemAmount ?? 100;
  const maxWalletUsage =
    walletCapPaise(
      itemCashbackScale4(subtotal, discountPercent),
      cashbackRedeemPercent,
      maxRedeemAmount
    ) / 100;
  // Wallet redemption is cash-mode only (Cart forces the wallet off in
  // SuperCoins mode); the mode-change effect below keeps the toggle honest.
  const walletDeduction =
    useWalletBalance && !inSuperCoinMode
      ? Math.min(walletBalance, maxWalletUsage)
      : 0;
  const displayCash = Math.max(
    0,
    subtotal - walletDeduction - displaySCDeduction
  );
  // Fee percent differs by mode, matching the backend's own switch.
  const FEE_PERCENT = inSuperCoinMode
    ? platformFeeConfig.feePercent
    : platformFeeConfig.feePercentCash;
  const FEE_MAX = inSuperCoinMode
    ? platformFeeConfig.feeMax
    : platformFeeConfig.feeMaxCash;
  const displayFee = useMethodFee
    ? computeMethodFee(activePaymentMethod, displayCash)
    : Number(Math.min(subtotal * FEE_PERCENT, FEE_MAX).toFixed(2));
  const displayTotal = Number((displayCash + displayFee).toFixed(2));

  const earnEstimate = useSuperCoinEarnEstimate(
    brand ? [{ brandId: brand.BrandId, lineTotal: subtotal }] : [],
    displayCash,
    inSuperCoinMode
  );
  const estimatedEarn = earnEstimate ?? 0;
  const cashbackAmount = displayCash * (discountPercent / 100);
  const earnText = inSuperCoinMode
    ? `Earn ${estimatedEarn.toFixed(2)} SuperCoins`
    : `Earn ${cashbackAmount.toFixed(2)} cashback points${
        discountPercent > 0 ? ` (${discountPercent.toFixed(0)}%)` : ""
      }`;

  // Countdown shown after the coins are on hold ("Pay within 14:59").
  // On expiry the hold is dead server-side: drop the local authorized state
  // (same as Cart's countdown effect) so the Pay button stops claiming a
  // deduction the backend will reject.
  useEffect(() => {
    if (!scAuthorized || !scHoldContext) return;
    const tick = () => {
      const endMs =
        scHoldContext.stampExpiry ??
        (scHoldContext.transactionTime
          ? new Date(scHoldContext.transactionTime).getTime() + 15 * 60 * 1000
          : Date.now() + 15 * 60 * 1000);
      const remaining = Math.max(0, endMs - Date.now());
      if (remaining <= 0) {
        scHoldContextRef.current = null;
        setScHoldContext(null);
        setScAuthorized(false);
        setScCountdownDisplay("");
        toast({
          title: "SuperCoin hold expired",
          description: "Please apply your SuperCoins again to continue.",
        });
        return;
      }
      const m = String(Math.floor(remaining / 60000)).padStart(2, "0");
      const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
      setScCountdownDisplay(`${m}:${s}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [scAuthorized, scHoldContext, toast]);

  // ---------------------------------------------------------------------------
  // Order lifecycle: one PENDING order per amount/quantity, reused across the
  // OTP + validate + pay steps (same as Cart's ensureOrder).
  // ---------------------------------------------------------------------------
  const orderRef = useRef<{ orderNumber: string; signature: string } | null>(
    null
  );
  const paymentInFlightRef = useRef(false);

  const unholdSuperCoin = async () => {
    const holdContext = scHoldContextRef.current || scHoldContext;
    scHoldContextRef.current = null;
    setScHoldContext(null);
    setScAuthorized(false);
    setScCountdownDisplay("");
    if (!holdContext || !superCoinIdentity) return;
    try {
      await cancelSuperCoinHold({
        identity: superCoinIdentity,
        merchantTransactionId: holdContext.merchantTransactionId,
        merchantWalletId: holdContext.merchantWalletId,
      });
    } catch (error) {
      console.warn("Failed to cancel SuperCoin hold", error);
    }
  };

  // Amount/quantity edits invalidate the order and release any hold.
  useEffect(() => {
    orderRef.current = null;
    setScRedeemedOpen(false);
    if (scHoldContextRef.current || scAuthorized) {
      void unholdSuperCoin();
      setScPreviewOff(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, quantity, brand?.BrandId]);

  // Leaving SuperCoins mode releases the hold (same as Cart's rewardMode
  // effect cancelling when switching back to cashbackWallet). Entering
  // SuperCoins mode also forces wallet redemption off, like Cart.
  useEffect(() => {
    if (payMode === "superCoins") {
      setUseWalletBalance(false);
    }
    if (payMode !== "superCoins" && (scHoldContextRef.current || scAuthorized)) {
      void unholdSuperCoin();
      setScPreviewOff(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payMode]);

  // If the tab closes mid-flow, release an unspent hold.
  useEffect(() => {
    if (!open) {
      setScRedeemedOpen(false);
      if (scHoldContextRef.current || scAuthorized) {
        void unholdSuperCoin();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Safety net: unhold via keepalive if the user closes the tab before paying.
  useEffect(() => {
    if (!superCoinIdentity) return;
    const handleBeforeUnload = () => {
      const holdContext = scHoldContextRef.current;
      if (!holdContext || paymentInFlightRef.current) return;
      const payload = JSON.stringify({
        identity: superCoinIdentity,
        merchantTransactionId: holdContext.merchantTransactionId,
        merchantWalletId: holdContext.merchantWalletId,
      });
      let token: string | undefined;
      try {
        token = JSON.parse(localStorage.getItem("authUser") || "{}").token;
      } catch {
        /* no token */
      }
      void fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/v1/supercoin/unhold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
        keepalive: true,
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [superCoinIdentity]);

  const generateOrderNumber = () => {
    const today = new Date();
    const yymmdd =
      today.getFullYear().toString().slice(-2) +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");
    const uuid = window.crypto.randomUUID();
    return "ORD" + yymmdd + uuid.replace(/-/g, "").slice(0, 12).toUpperCase();
  };

  const ensureOrder = async (): Promise<string> => {
    // Wallet flag is part of the signature: a PENDING order created with
    // walletUsed=false can't be reused once the toggle flips, or the
    // backend's strict walletAmount/walletUsed compare would reject it.
    const signature = `${brand?.BrandId}|${amount}|${quantity}|w${useWalletBalance ? 1 : 0}`;
    if (orderRef.current && orderRef.current.signature === signature) {
      return orderRef.current.orderNumber;
    }
    if (!brand || !user?.clientId) {
      throw new Error("Please login to continue payment.");
    }
    const orderNumber = generateOrderNumber();
    const orderRequest = {
      order: {
        clientId: user.clientId,
        orderNumber,
        totalAmount: subtotal,
        currency: "INR",
        status: "PENDING",
        walletUsed: useWalletBalance,
        walletAmount: walletDeduction,
        // Cart's rewardMode effect sets earnCashback=false in SuperCoin mode;
        // mirror that so the backend credits coins instead of cashback.
        earnCashback: !inSuperCoinMode,
      },
      items: [
        {
          brandId: brand.BrandId,
          quantity,
          unitValue: amount,
          lineTotal: subtotal,
          meta: "{}",
        },
      ],
    };
    const response = await createOrderMutation.mutateAsync(orderRequest);
    orderRef.current = { orderNumber: response.orderNumber, signature };
    return response.orderNumber;
  };

  const startBackendPayment = (orderNumber: string) => {
    backendPaymentMutation.mutate(
      {
        orderNumber,
        paymentMethod: useMethodFee ? activePaymentMethod?.code : undefined,
        paymentModes: useMethodFee ? paymentMethods.map((m) => m.code) : undefined,
      },
      {
        onSuccess: (response) => {
          const isSuccess = response.status === 1 || response.status === true;
          const paymentUrl =
            response.payment_url || response.paymentUrl || response.data;

          if (!isSuccess || !paymentUrl) {
            void unholdSuperCoin();
            setPaymentFlowOpen(false);
            setIsProcessing(false);
            toast({
              title: "Payment initiation failed",
              description:
                response.message || "Unable to initiate payment. Please try again.",
              variant: "destructive",
            });
            return;
          }

          paymentInFlightRef.current = true;
          // The hold is redeemed server-side against this order; just drop the
          // local reference (same as Cart before redirecting).
          scHoldContextRef.current = null;
          try {
            clearCart();
          } catch (e) {
            console.warn("Failed to clear cart before redirect", e);
          }
          window.location.href = paymentUrl;
        },
        onError: (error: any) => {
          void unholdSuperCoin();
          setPaymentFlowOpen(false);
          setIsProcessing(false);
          console.error("Payment initiation error:", error);
          toast({
            title: "Payment failed",
            description:
              error.message || "Failed to initiate payment. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const doPay = async () => {
    if (!user?.clientId) {
      toast({
        title: "Login required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      window.setTimeout(() => navigate("/login"), 1500);
      return;
    }

    setIsProcessing(true);
    // Cart's handlePayNow shows PaymentFlowSheet for the whole pay attempt;
    // it only comes down again if the attempt fails (success redirects away).
    setPaymentFlowOpen(true);
    try {
      const orderNumber = await ensureOrder();
      const validation = await validateOrderMutation.mutateAsync({
        orderNumber,
        cartTotal: subtotal,
        // Must match what ensureOrder stored, or OrderValidationService
        // rejects with "Wallet amount mismatch".
        walletAmount: walletDeduction,
        walletUsed: useWalletBalance,
      });

      if (!validation.valid) {
        void unholdSuperCoin();
        setPaymentFlowOpen(false);
        setIsProcessing(false);
        toast({
          title: "Validation Failed",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      startBackendPayment(orderNumber);
    } catch (error: any) {
      void unholdSuperCoin();
      setPaymentFlowOpen(false);
      setIsProcessing(false);
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Failed",
        description:
          error?.message || "Failed to continue checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Create (or refresh) the pending order, then open the Flipkart OTP modal
  // for the hold -- same sequence as Cart's openSuperCoinFlow.
  const openSuperCoinFlow = async () => {
    if (!superCoinIdentity) {
      toast({
        title: "SuperCoins unavailable",
        description:
          "SuperCoins need a verified mobile number on your profile. You can still pay by cash.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsProcessing(true);
      const orderNumber = await ensureOrder();
      const details = await fetchOrderDetails(orderNumber);
      if (String(details?.status || "").toUpperCase() !== "PENDING") {
        throw new Error("This order is no longer pending.");
      }
      // A pending order may still reference a previous (expired) hold.
      const staleTxnId = (details as { scMerchantTxnId?: string })
        ?.scMerchantTxnId;
      if (staleTxnId) {
        await cancelSuperCoinHold({
          identity: superCoinIdentity,
          merchantTransactionId: staleTxnId,
          merchantWalletId: superCoinMerchantWalletId,
        });
        scHoldContextRef.current = null;
        setScHoldContext(null);
        setScAuthorized(false);
        setScCountdownDisplay("");
      }
      setScOrderNumber(orderNumber);
      setScOTPModalOpen(true);
    } catch (error) {
      console.error("Failed to create order before SuperCoin hold", error);
      const raw = error instanceof Error ? error.message : "";
      toast({
        title: "SuperCoins unavailable right now",
        description:
          !raw || /status code 4\d\d/i.test(raw)
            ? "We couldn't apply SuperCoins just now. You can pay without them or try again in a little while."
            : raw,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPressed = () => {
    if (!user?.clientId) {
      toast({
        description: "Please login to continue payment",
        variant: "destructive",
      });
      window.setTimeout(() => navigate("/login"), 1500);
      return;
    }
    // Same as Cart's onPayPressed: coins selected but not yet authorised ->
    // ask with the "Use X SuperCoins?" prompt first, then the Flipkart OTP.
    if (inSuperCoinMode && !scAuthorized && scPreviewDeduction > 0) {
      setScPromptOpen(true);
      return;
    }
    void doPay();
  };

  const handleScAuthorized = (context: SuperCoinHoldContext) => {
    scHoldContextRef.current = context;
    setScHoldContext(context);
    setScAuthorized(true);
    setScOTPModalOpen(false);
    // Redeemed countdown first; it calls doPay when the timer hits zero.
    setScRedeemedOpen(true);
  };

  // Back out of SuperCoins mode: if coins are already on hold, confirm first
  // (same dialog as Cart's requestSwitchToCashback), otherwise just leave.
  const requestLeaveSuperCoins = (next: PayMode | null) => {
    if (scAuthorized && (scHoldContextRef.current || scHoldContext)) {
      setScRemoveConfirmOpen(true);
      return;
    }
    setPayMode(next);
  };

  // Every time the sheet opens: start collapsed (so the card slides down
  // into view), then open `initialTab` — defaulting to About.
  useEffect(() => {
    if (!open) return;
    setActiveTab(null);
    const t = window.setTimeout(
      () => setActiveTab(initialTab ?? "about"),
      150
    );
    return () => window.clearTimeout(t);
  }, [open, initialTab]);

  // Hint animation: after the info card has finished opening, scroll its
  // content down and back to the top so the user sees there's more info.
  useEffect(() => {
    if (!open || !activeTab) return;
    let raf: number | null = null;
    let timer: number | null = null;
    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const start = window.setTimeout(() => {
      const el = infoScrollRef.current;
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 8) return;
      const ease = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const duration = 850;
      let t0 = 0;
      const down = (now: number) => {
        if (!t0) t0 = now;
        const p = Math.min((now - t0) / duration, 1);
        el.scrollTop = max * ease(p);
        if (p < 1) {
          raf = requestAnimationFrame(down);
        } else {
          timer = window.setTimeout(() => {
            const up0 = performance.now();
            const up = (now2: number) => {
              const p2 = Math.min((now2 - up0) / duration, 1);
              el.scrollTop = max * (1 - ease(p2));
              if (p2 < 1) raf = requestAnimationFrame(up);
              else raf = null;
            };
            raf = requestAnimationFrame(up);
          }, 450);
        }
      };
      raf = requestAnimationFrame(down);
    }, 400); // let the max-height open transition (~300ms) finish first

    return () => {
      window.clearTimeout(start);
      stop();
    };
  }, [activeTab, open]);

  useEffect(() => {
    if (!brand) return;

    if (typeof initialQuantity === "number" && initialQuantity > 0) {
      setQuantity(initialQuantity);
    }

    if (typeof initialAmount === "number" && initialAmount > 0) {
      const clampedAmount = Math.max(min, Math.min(max, initialAmount));
      setAmount(clampedAmount);
      return;
    }

    if (
      brand.BrandType?.toLowerCase() === "fixed" &&
      brand.DenominationList?.length
    ) {
      setAmount(brand.DenominationList[0]);
    } else {
      setAmount(min);
    }
  }, [brand, min, max, initialAmount, initialQuantity]);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
      timeoutId = window.setTimeout(() => setIsMounted(false), 300);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleSheetClose = () => {
    onClose();
  };

  const handleAddToCart = () => {
    if (!brand) return;

    addToCart({
      brandId: brand.BrandId,
      brandName: brand.BrandName,
      quantity,
      unitValue: amount,
      image: getImageUrl(brand) || undefined,
    });

    setShowSuccess(true);

    window.setTimeout(() => {
      setShowSuccess(false);
      handleSheetClose();
      navigate("/cart?tab=cart");
    }, 2200);
  };

  const handleBuyNow = () => {
    if (!brand) return;
    if (!user?.clientId) {
      toast({
        description: "Please login to continue payment",
        variant: "destructive",
      });
      window.setTimeout(() => navigate("/login"), 1500);
      return;
    }
    // Sticky like Cart's rewardMode: if coins are already on hold, reopen
    // straight into SuperCoins mode instead of the chooser (resetting to
    // the chooser would trip the mode-change unhold above).
    setPayMode(scAuthorized ? "superCoins" : null);
    setScPreviewOff(false);
    setPayPanelOpen(true);
  };

  if (!isMounted) return null;

  const aboutContent = brand?.Description || "No description available.";
  const termsContent =
    typeof brand?.Tnc === "string"
      ? brand.Tnc
      : Object.values(brand?.Tnc || {}).join("\n") || "No terms available.";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="overlay"
        onClick={handleSheetClose}
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />
      <div className="sheet-wrapper">
      <section
        className={`sheet ${isVisible ? "sheet-open" : "sheet-closing"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Payment details"
      >
        <style>{`
            .overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.3);
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              z-index: 10;
            }
            .sheet-wrapper {
              position: fixed;
              bottom: 63px;
              left: 0;
              width: 100%;
              display: flex;
              justify-content: center;
              z-index: 20;
              pointer-events: none;
            }
            .sheet {
              position: relative;
              width: 100%;
              max-width: 390px;
              height: 600px;
              background: #F3F5F9;
              border-top-left-radius: 50px;
              border-top-right-radius: 50px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-shadow: 0px -4px 20px rgba(0,0,0,0.2);
              pointer-events: auto;
            }
            .sheet-open {
              animation: slideUp 0.4s ease forwards;
            }
            .sheet-closing {
              animation: slideDown 0.28s ease forwards;
            }
            .sheet-header {
              position: relative;
              display: flex;
              align-items: center;
              gap: 8px;
              min-height: 72px;
              padding: 20px 16px 10px;
              color: #3E3E3E;
              font-family: Poppins, sans-serif;
              font-size: 14px;
              font-style: normal;
              font-weight: 500;
              line-height: 21px;
              z-index: 2;
            }
            .drag-handle {
              position: absolute;
              left: 50%;
              top: 12px;
              width: 100px;
              height: 10px;
              transform: translateX(-50%);
              border-radius: 10px;
              background: #D9D9D9;
            }
            .sheet-back-button {
              width: 24px;
              height: 24px;
              display: grid;
              place-items: center;
              flex-shrink: 0;
              z-index: 3;
            }
            .sheet-content {
              flex: 1;
              overflow-y: auto;
              overflow-x: hidden;
              padding: 8px 16px 76px;
              scroll-behavior: smooth;
            }
            .sheet-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              background: #F3F5F9;
              padding: 8px 16px 12px;
              box-shadow: 0 -4px 10px rgba(0,0,0,0.08);
              z-index: 3;
            }
            .top-card {
              position: relative;
              margin: 0 auto;
              width: 342px;
              height: 86px;
              box-shadow: 0px 6px 20px rgba(0,0,0,0.15);
              border-radius: 10px;
              background: #FFFFFF;
            }
            .amount-box {
              margin: 6px auto 6px;
              width: 342px;
            }
            .quantity-box {
              margin-top: 10px;
              margin-bottom: 10px;
            }
            .info-section {
              margin-top: 24px;
              margin-bottom: 8px;
            }

            .expandable {
              max-height: 0;
              overflow: hidden;
              transition: max-height 0.3s ease;
            }
            .expandable.open {
              max-height: 300px;
              overflow-y: auto;
            }
            .bottom-bar {
              width: 342px;
              margin: 0 auto;
            }
            .cta-inner {
              display: flex;
              gap: 12px;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0px 4px 12px rgba(0,0,0,0.12);
              padding: 10px 12px;
              border-radius: 10px;
            }
            .cta-inner > button {
              flex: 1;
              min-width: 0;
            }
            .cta-gradient {
              background: linear-gradient(90deg, #9747FF 0%, #5B2B99 100%);
              color: white;
            }
            .pay-text {
              color: #9747FF;
              font-family: Poppins, sans-serif;
              font-weight: 600;
              font-size: 14px;
              line-height: 20px;
            }
            .pay-btn {
              min-width: 130px;
              height: 42px;
              border-radius: 12px;
              background: #ffffff;
              border: 1px solid #E5E7EB;
              cursor: pointer;
              box-shadow: 0px 4px 12px rgba(17, 24, 39, 0.08);
              padding: 0 12px;
            }
            .pay-btn:hover {
              background: #FCFCFD;
            }
            .pay-btn:disabled {
              background: #E0E0E0;
              color: #9E9E9E;
              border-color: #D1D5DB;
              cursor: not-allowed;
              box-shadow: none;
              opacity: 1;
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes slideDown {
              from { transform: translateY(0); }
              to { transform: translateY(100%); }
            }
          `}</style>

        <div className="sheet-header">
          <span className="drag-handle" />
          <button
            onClick={handleSheetClose}
            aria-label="Back"
            className="sheet-back-button"
          >
            <ChevronLeft className="h-6 w-6 text-black" strokeWidth={2.2} />
          </button>
          <span>Payment Details</span>
        </div>

        <div className="sheet-content">
          <div className="top-card overflow-hidden">
            <div className="flex h-full items-center gap-3 p-3">
              <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F3F4F6]">
                <img loading="lazy" decoding="async"
                  src={getImageUrl(brand) || "/brand-placeholder.png"}
                  alt={brand?.BrandName}
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/brand-placeholder.png";
                  }}
                />
              </div>

              <div className="min-w-0 flex-1 pr-[70px]">
                <div
                  className="truncate text-[16px] font-semibold leading-[24px] text-black"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {brand?.BrandName}
                </div>
                <div
                  className="truncate text-[16px] font-semibold leading-[24px] text-black"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  E-Gift Cards
                </div>
                <div
                  className="mt-1 inline-flex h-[20px] min-w-[145px] items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#78DEFF_50%,#488599_100%)] px-3 text-[11px] font-normal leading-[15px] text-black shadow-[0px_2px_4px_rgba(120,222,255,0.5)]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {brand?.Category || "E-Commerce & Shopping"}
                </div>
              </div>
            </div>

            <div className="absolute right-0 top-0 flex h-[30px] items-center rounded-bl-[20px] rounded-tl-[20px] bg-[linear-gradient(129.26deg,#9747FF_20.69%,#5B2B99_72.49%)] px-[10px] text-white">
              <div
                className="text-center text-[10px] font-normal leading-[12px]"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Cashback
                <br />
                <span className="font-semibold">
                  {`${discountPercent}%`}
                </span>
              </div>
            </div>
          </div>

          <div
            className="amount-box overflow-hidden bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.15)]"
            style={{ borderRadius: 10, padding: "14px 14px" }}
          >
            <div
              className="text-[12px] font-semibold leading-[18px] text-black"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Select Amount
            </div>

            {min > 0 && min === max ? (
              <div className="mt-[4px]">
                <div className="flex flex-wrap gap-[6px]">
                  <button className="h-[34px] rounded-[8px] border-2 border-[#9747FF] bg-[#9747FF] px-3 text-[12px] font-semibold leading-[18px] text-white shadow-lg">
                    ₹{min.toLocaleString()}
                  </button>
                </div>
                <div className="mt-[2px]">
                  <span className="relative inline-block rounded text-[15px] font-medium leading-[22px] text-[#10B981]">
                    +₹{Math.round(min * discountPercent / 100)} cashback
                  </span>
                </div>
              </div>
            ) : isFixedType ? (
              <div className="mt-[4px]">
                <div className="flex flex-wrap gap-[6px]">
                  {(brand?.DenominationList || []).map((denom: number) => {
                    const isActive = amount === denom;
                    return (
                      <button
                        key={denom}
                        onClick={() => setAmount(denom)}
                        className={`h-[34px] rounded-[8px] border-2 px-3 text-[12px] font-semibold leading-[18px] transition-all duration-200 ${
                          isActive
                            ? "border-[#9747FF] bg-[#9747FF] text-white shadow-lg scale-105"
                            : "border-[#DAD5FF] bg-white text-[#3E3E3E] hover:border-[#9747FF]"
                        }`}
                      >
                        ₹{denom.toLocaleString()}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-[2px]">
                  {(brand?.DenominationList || []).map((denom: number) => {
                    if (amount !== denom) return null;
                    const cb = Math.round(denom * discountPercent / 100);
                    return (
                      <motion.span
                        key={`cb-${denom}`}
                        initial={{ opacity: 0, y: -4, scale: 0.9, boxShadow: "0 0 0px rgba(16,185,129,0)" }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: [0.9, 1.12, 1],
                          boxShadow: [
                            "0 0 0px rgba(16,185,129,0)",
                            "0 0 14px rgba(16,185,129,0.4)",
                            "0 0 0px rgba(16,185,129,0)"
                          ]
                        }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        style={{ borderRadius: 4, fontFamily: "Poppins, sans-serif" }}
                        className="relative inline-block text-[15px] leading-[22px] text-[#10B981] font-medium"
                      >
                        +₹{cb} cashback
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                          style={{ transformOrigin: "center" }}
                          className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[#10B981] rounded-full"
                        />
                      </motion.span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-[4px]">
                <div
                  className="mb-[6px] flex items-center gap-[4px] text-[12px] font-medium leading-[16px] text-[#555]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  <span className="inline-block h-[4px] w-[4px] rounded-full bg-[#9747FF]" />
                  Enter amount between ₹{min.toLocaleString()} - ₹{max.toLocaleString()}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount === 0 ? "" : amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    if (raw === "") {
                      setAmount(0);
                      return;
                    }
                    setAmount(Number(raw));
                  }}
                  onBlur={() => {
                    if (amount !== 0 && (amount < min || amount > max)) setAmount(0);
                  }}
                  className="w-full rounded-[8px] border-2 border-[#DAD5FF] bg-white px-3 py-2 text-[12px] font-medium text-[#3E3E3E] outline-none transition-colors focus:border-[#9747FF] focus:ring-1 focus:ring-[#9747FF]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                />
                <div className="mt-[4px] text-[11px] leading-[14px] text-[#10B981] font-medium text-right">
                  +₹{Math.round(amount * discountPercent / 100)} cashback
                </div>
              </div>
            )}

            <div className="quantity-box mt-[6px] border-t border-[#A1A1A1] pt-[4px]">
              <div
                className="text-[12px] font-semibold leading-[18px] text-black"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Quantity:
              </div>

              <div className="mt-[4px] flex items-center justify-between">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white"
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-6 w-6 text-[#4E4E4E]" strokeWidth={2.2} />
                </button>

                <input
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="mx-[8px] h-[30px] w-[221px] rounded-[5px] border border-[#9747FF] bg-white text-center text-[12px] font-bold leading-[18px] text-[#4E4E4E] outline-none"
                  inputMode="numeric"
                  aria-label="Quantity"
                />

                <button
                  onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, quantity + 1))}
                  disabled={quantity >= MAX_QUANTITY_PER_ITEM}
                  className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Increase quantity"
                >
                  <Plus className="h-6 w-6 text-[#4E4E4E]" strokeWidth={2.2} />
                </button>
              </div>
              <div
                className="mt-[8px] text-center text-[15px] leading-[22px] text-black"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Total: ₹{amount.toLocaleString()} x {quantity} ={" "}
                <span className="font-semibold text-[#9747FF]">
                  ₹{(amount * quantity).toLocaleString()}
                </span>
                {discountPercent > 0 && (
                  <span className="ml-1 text-[#10B981]">
                    + ₹{Math.round(amount * quantity * discountPercent / 100).toLocaleString()} cashback
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="info-section mx-auto flex h-[44px] w-[342px] items-center justify-between rounded-[10px] bg-white px-2 shadow-[0px_6px_20px_rgba(0,0,0,0.15)]">
            <button
              type="button"
              aria-expanded={activeTab === "about"}
              onClick={() =>
                setActiveTab(activeTab === "about" ? null : "about")
              }
              className="inline-flex h-[30px] w-[71px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
            >
              <span className="text-[16px] leading-none">i</span>
              About
            </button>
            <button
              type="button"
              aria-expanded={activeTab === "how"}
              onClick={() => setActiveTab(activeTab === "how" ? null : "how")}
              className="inline-flex h-[30px] w-[102px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
            >
              <span className="text-[16px] leading-none">*</span>
              How to Use
            </button>
            <button
              type="button"
              aria-expanded={activeTab === "terms"}
              onClick={() =>
                setActiveTab(activeTab === "terms" ? null : "terms")
              }
              className="inline-flex h-[30px] w-[73px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
            >
              <span className="text-[16px] leading-none">#</span>
              Terms
            </button>
          </div>

          <div
            ref={infoScrollRef}
            className={`expandable ${activeTab ? "open" : ""}`}
          >
            {activeTab === "about" && (
              <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                {aboutContent}
              </div>
            )}

            {activeTab === "how" && (
              <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                {brand?.RedeemSteps?.length ? (
                  brand.RedeemSteps.map((step: any, index: number) => (
                    <div key={index} className="mb-2 last:mb-0">
                      {step.title || step.name}
                      {step.description ? ` - ${step.description}` : ""}
                    </div>
                  ))
                ) : (
                  <span>No instructions available.</span>
                )}
              </div>
            )}

            {activeTab === "terms" && (
              <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] whitespace-pre-line">
                {termsContent}
              </div>
            )}
          </div>
        </div>

        <div className="sheet-footer">
          <div className="bottom-bar">
            <div className="cta-inner">
              {showAddToCart && (
                <button
                  onClick={handleAddToCart}
                  className="flex h-[42px] items-center justify-center gap-2 rounded-[10px] cta-gradient"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span
                    className="text-[14px] font-semibold leading-[20px]"
                  >
                    Add to Cart
                  </span>
                </button>
              )}

              <button
                onClick={handleBuyNow}
                className="pay-btn flex h-[42px] items-center justify-center shadow-sm transition-colors"
                aria-label="Buy Now"
              >
                <span className="pay-text">Buy Now</span>
              </button>
            </div>
          </div>
        </div>
        </section>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Payment panel: choose cash vs SuperCoins+Cash, review, pay        */}
      {/* ---------------------------------------------------------------- */}
      {payPanelOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center pb-[64px]">
            <button
              type="button"
              aria-label="Close payment options"
              className="absolute inset-0 bg-black/40"
              onClick={() => setPayPanelOpen(false)}
            />
            <div
              className="relative max-h-[88%] w-full max-w-[390px] overflow-y-auto rounded-t-[28px] bg-white p-4 pb-6 shadow-[0_-16px_48px_rgba(33,24,74,0.18)]"
              style={{ fontFamily: "Poppins, sans-serif" }}
              role="dialog"
              aria-modal="true"
              aria-label="Choose payment method"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {payMode && (
                    <button
                      type="button"
                      aria-label="Change payment method"
                      onClick={() => requestLeaveSuperCoins(null)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#F3F5F9]"
                    >
                      <ChevronLeft className="h-5 w-5 text-[#3E3E3E]" />
                    </button>
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      {payMode ? "You pay" : "How do you want to pay?"}
                    </p>
                    {payMode && (
                      <p className="text-[26px] font-extrabold leading-tight tabular-nums text-[#9747FF]">
                        ₹{displayTotal.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setPayPanelOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-[16px] text-[#6B7280]"
                >
                  ✕
                </button>
              </div>

              {payMode && (
                <p className="mb-3 flex items-center justify-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  {inSuperCoinMode && (
                    <img loading="lazy" decoding="async"
                      src={superCoinIcon}
                      alt=""
                      className="h-3.5 w-3.5 object-contain"
                    />
                  )}
                  {earnText}
                </p>
              )}

              {!payMode && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setPayMode("cashbackWallet")}
                    className="flex w-full items-center gap-3 rounded-2xl border-2 border-[rgba(151,71,255,0.35)] bg-[rgba(151,71,255,0.05)] p-3 text-left transition-colors hover:border-[#9747FF]"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#9747FF] text-white">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[#111827]">
                        Pay via cash/wallet
                      </span>
                      <span className="block text-xs text-[#6B7280]">
                        UPI, cards, netbanking &amp; more
                      </span>
                    </span>
                  </button>

                  {superCoinEligible && (
                    <button
                      type="button"
                      onClick={() => setPayMode("superCoins")}
                      className="flex w-full items-center gap-3 rounded-2xl border-2 border-[rgba(52,211,153,0.45)] bg-[rgba(52,211,153,0.08)] p-3 text-left transition-colors hover:border-[#34D399]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#34D399]">
                        <img loading="lazy" decoding="async"
                          src={superCoinIcon}
                          alt=""
                          className="h-6 w-6 object-contain"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-sm font-bold text-[#111827]">
                          <span>Pay via Cash+</span>
                          <img loading="lazy" decoding="async"
                            src={superCoinIcon}
                            alt=""
                            className="h-4 w-4 object-contain"
                          />
                          <span>SuperCoins</span>
                        </span>
                        <span className="block text-xs text-[#6B7280]">
                          Redeem SuperCoins, pay the rest by cash
                        </span>
                      </span>
                    </button>
                  )}
                </div>
              )}

              {payMode === "cashbackWallet" && (
                <div className="space-y-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={useWalletBalance}
                    disabled={walletBalance <= 0}
                    onClick={() => setUseWalletBalance(!useWalletBalance)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-[rgba(151,71,255,0.25)] bg-[rgba(151,71,255,0.05)] px-3 py-3 text-left disabled:opacity-60"
                  >
                    <Wallet className="h-5 w-5 shrink-0 text-[#9747FF]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#111827]">
                        Use cashback points
                      </span>
                      <span className="block text-xs text-[#6B7280]">
                        {walletBalance > 0
                          ? `${walletBalance.toFixed(2)} points available · use up to ${maxWalletUsage.toFixed(2)} here`
                          : "No cashback points yet"}
                      </span>
                    </span>
                    <span
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        useWalletBalance ? "bg-[#9747FF]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          useWalletBalance ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </button>

                  <div className="space-y-1.5 border-t border-black/5 pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">Total</span>
                      <span className="font-medium tabular-nums text-[#111827]">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>
                    {walletDeduction > 0 && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span>Cashback points to redeem</span>
                        <span className="font-medium tabular-nums">
                          -₹{walletDeduction.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">
                        Platform fee
                        {useMethodFee && activePaymentMethod && displayCash > 0
                          ? ` · ${activePaymentMethod.label}`
                          : ""}
                      </span>
                      <span className="font-medium tabular-nums text-[#111827]">
                        ₹{displayFee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      useMethodFee ? setMethodModalOpen(true) : handlePayPressed()
                    }
                    disabled={isProcessing || displayTotal <= 0}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#9747FF] to-[#5B2B99] text-[15px] font-bold text-white shadow-lg shadow-[rgba(151,71,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing
                      ? "Processing..."
                      : `Pay ₹${displayTotal.toFixed(2)}`}
                  </button>
                </div>
              )}

              {payMode === "superCoins" && (
                <div className="space-y-3">
                  <div className="space-y-2 rounded-2xl border border-[rgba(151,71,255,0.25)] bg-[rgba(151,71,255,0.05)] px-3 py-3">
                    {/* Once eligible the card is replaced by the slider below
                        (same visibility rule as Cart's SuperCoin block). */}
                    <div className={scState.eligible ? "hidden" : ""}>
                      <SuperCoinStatusCard
                        mobile={user?.mobile}
                        enabled={scAuthorized}
                        maxRedeemable={maxSuperCoinRedeemable}
                        estimatedEarn={estimatedEarn}
                        hideToggle
                        coinsOnHold={0}
                        supercoinMultiplier={scMultiplier}
                        onStateChange={({ eligible, balance }) =>
                          setScState({ eligible, balance })
                        }
                      />
                    </div>

                    {scState.eligible && scAuthorized && (
                      <div className="flex items-center gap-3">
                        <img loading="lazy" decoding="async"
                          src={superCoinIcon}
                          alt=""
                          className="h-5 w-5 shrink-0 object-contain"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#7C3AED]">
                            {Math.round(scHoldContext?.amount ?? 0)} coins
                            applied · saving ₹{superCoinDeduction.toFixed(2)}
                          </span>
                          {scCountdownDisplay && (
                            <span className="flex items-center gap-1 text-xs text-[#7C3AED]">
                              <Clock className="h-3 w-3" /> Pay within{" "}
                              {scCountdownDisplay}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-semibold text-[#7C3AED] underline"
                          onClick={() => {
                            void unholdSuperCoin();
                            setScPreviewOff(false);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {scState.eligible && !scAuthorized && maxSCCoins >= 1 && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED]">
                            <img loading="lazy" decoding="async"
                              src={superCoinIcon}
                              alt=""
                              className="h-4 w-4 object-contain"
                            />
                            Use SuperCoins
                          </span>
                          <span className="text-sm font-bold tabular-nums text-[#7C3AED]">
                            {scPreviewOff ? 0 : selectedSCCoins} coins
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={maxSCCoins}
                          step={1}
                          value={
                            scPreviewOff
                              ? 0
                              : Math.min(Math.max(selectedSCCoins, 1), maxSCCoins)
                          }
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            if (v < 1) {
                              setScPreviewOff(true);
                              return;
                            }
                            setScPreviewOff(false);
                            setSelectedSCCoins(v);
                          }}
                          aria-label="SuperCoins to use"
                          className="sc-coin-slider h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
                          style={{
                            background: `linear-gradient(to right, #9747FF 0%, #9747FF ${
                              scPreviewOff
                                ? 0
                                : (Math.min(Math.max(selectedSCCoins, 1), maxSCCoins) /
                                    maxSCCoins) *
                                  100
                            }%, rgba(151,71,255,0.2) ${
                              scPreviewOff
                                ? 0
                                : (Math.min(Math.max(selectedSCCoins, 1), maxSCCoins) /
                                    maxSCCoins) *
                                  100
                            }%, rgba(151,71,255,0.2) 100%)`,
                          }}
                        />
                        <div className="flex items-center justify-between text-xs text-[#6B7280]">
                          <span>
                            Balance {scState.balance.toFixed(0)} · max{" "}
                            {maxSCCoins}
                          </span>
                          <span>
                            ₹1 = {Number(scMultiplier.toFixed(2))} SC · up to{" "}
                            {brandCapShare ?? scCapPercent}% of voucher value
                          </span>
                        </div>
                      </>
                    )}

                    {scState.eligible && !scAuthorized && maxSCCoins < 1 && (
                      <p className="text-sm text-[#6B7280]">
                        {scState.balance <= 0
                          ? "No SuperCoins to use right now. You'll still earn coins on this order."
                          : "SuperCoins can't be used on this voucher."}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 border-t border-black/5 pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">Total</span>
                      <span className="font-medium tabular-nums text-[#111827]">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between ${
                        displaySCDeduction > 0 ? "text-emerald-600" : "text-[#6B7280]"
                      }`}
                    >
                      <span>SuperCoins to redeem</span>
                      <span className="font-medium tabular-nums">
                        -₹{displaySCDeduction.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#6B7280]">
                        Platform fee
                        {useMethodFee && activePaymentMethod && displayCash > 0
                          ? ` · ${activePaymentMethod.label}`
                          : ""}
                      </span>
                      <span className="font-medium tabular-nums text-[#111827]">
                        ₹{displayFee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      useMethodFee ? setMethodModalOpen(true) : handlePayPressed()
                    }
                    disabled={isProcessing || displayTotal <= 0}
                    className="flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#9747FF] to-[#5B2B99] text-[15px] font-bold text-white shadow-lg shadow-[rgba(151,71,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing
                      ? "Processing..."
                      : `Pay ₹${displayTotal.toFixed(2)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* UPI/netbanking chooser — opens as its own pop-up sheet when Pay   */}
        {/* is pressed (same contents as Cart's pay sheet), for both modes.    */}
        {/* ---------------------------------------------------------------- */}
        {payPanelOpen && methodModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center pb-[64px]">
            <button
              type="button"
              aria-label="Close payment methods"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMethodModalOpen(false)}
            />
            <div
              className="relative max-h-[88%] w-full max-w-[390px] overflow-y-auto rounded-t-[28px] bg-white p-4 pb-6 shadow-[0_-16px_48px_rgba(33,24,74,0.18)]"
              style={{ fontFamily: "Poppins, sans-serif" }}
              role="dialog"
              aria-modal="true"
              aria-label="Choose how to pay"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
                    You pay
                  </p>
                  <p className="text-[26px] font-extrabold leading-tight tabular-nums text-[#9747FF]">
                    ₹{displayTotal.toFixed(2)}
                  </p>
                  <p className="mt-1 flex w-fit items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {inSuperCoinMode && (
                      <img loading="lazy" decoding="async"
                        src={superCoinIcon}
                        alt=""
                        className="h-3.5 w-3.5 object-contain"
                      />
                    )}
                    {earnText}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setMethodModalOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full text-[16px] text-[#6B7280]"
                >
                  ✕
                </button>
              </div>

              {useMethodFee && (
                <PaymentMethodSelector
                  methods={paymentMethods}
                  value={activePaymentMethod?.code ?? ""}
                  onChange={setSelectedPaymentMethod}
                  cashAmount={displayCash}
                  disabled={isProcessing}
                />
              )}

              <button
                type="button"
                onClick={() => {
                  setMethodModalOpen(false);
                  handlePayPressed();
                }}
                disabled={isProcessing || displayTotal <= 0}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#9747FF] to-[#5B2B99] text-[15px] font-bold text-white shadow-lg shadow-[rgba(151,71,255,0.3)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing
                  ? "Processing..."
                  : `Pay ₹${displayTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        )}

        {superCoinIdentity && (
          <SuperCoinOTPModal
            open={scOTPModalOpen}
            onClose={() => {
              setScOTPModalOpen(false);
            }}
            onAuthorized={handleScAuthorized}
            onSwitchToCashback={() => {
              setScOTPModalOpen(false);
              setScOrderNumber("");
              requestLeaveSuperCoins("cashbackWallet");
            }}
            identity={superCoinIdentity}
            merchantWalletId={superCoinMerchantWalletId}
            orderNumber={scOrderNumber}
            displayName={user?.name || "Gift360 Checkout"}
            preloadedBalance={scState.balance}
            maxRedeemable={maxSuperCoinRedeemable}
            initialCoinAmount={selectedSCCoins}
          />
        )}

        {/* Redeemed → 3·2·1 → payment (cosmetic; always continues) */}
        <SuperCoinRedeemedModal
          open={scRedeemedOpen}
          onContinue={() => {
            setScRedeemedOpen(false);
            void doPay();
          }}
        />

        {/* Apply SuperCoins? — exact copy of Cart's scPromptOpen dialog */}
        <AlertDialog open={scPromptOpen} onOpenChange={setScPromptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Use {selectedSCCoins} SuperCoins?</AlertDialogTitle>
              <AlertDialogDescription>
                Save ₹{scPreviewDeduction.toFixed(2)} now. We'll confirm with a quick
                Flipkart OTP, then you pay the remaining ₹{displayTotal.toFixed(2)}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setScPromptOpen(false);
                  setScPreviewOff(true);
                  void doPay();
                }}
              >
                Pay without coins
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setScPromptOpen(false);
                  void openSuperCoinFlow();
                }}
              >
                Burn coins and pay
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove-SuperCoins confirm (same copy as Cart's dialog) */}
        <AlertDialog
          open={scRemoveConfirmOpen}
          onOpenChange={(open) => !open && setScRemoveConfirmOpen(false)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove your SuperCoins from this purchase?</AlertDialogTitle>
              <AlertDialogDescription>
                Your reserved SuperCoins will not be used for this payment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setScRemoveConfirmOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setScRemoveConfirmOpen(false);
                  void unholdSuperCoin();
                  setPayMode(null);
                  setScPreviewOff(false);
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cart's loading sheet while the payment attempt is in flight */}
        <PaymentFlowSheet open={paymentFlowOpen} state="loading" />

      <AddToCartSuccessModal open={showSuccess} />
    </div>
  );
}
