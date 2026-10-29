import { useRoute, useLocation } from "wouter";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Minus, Plus, Sparkles, Clock, Wallet, ArrowLeft, ShoppingBag } from "lucide-react";
import { fetchPlatformFeeConfig } from "@/api/brandsApi";
import { usePaymentMethodFees, computeMethodFee } from "@/hooks/usePaymentMethodFees";
import { useSuperCoinEarnEstimate } from "@/hooks/useSuperCoinEarnEstimate";

import { trackEvent } from "@/lib/analytics";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { fetchOrderDetails } from "@/api/orderApi";
import { initiateRetryPayment } from "@/api/paymentApi";
import PayUsingSheet from "@/components/PayUsingSheet";
import PayUsingField, { payMethodSubtext } from "@/components/PayUsingField";
import { easebuzzPaymentModes, isUpiPaymentMethod } from "@/lib/paymentModes";
import PaymentFlowSheet from "@/components/PaymentFlowSheet";
import SuperCoinStatusCard from "@/components/SuperCoinStatusCard";
import SuperCoinOTPModal, {
  type SuperCoinHoldContext,
} from "@/components/SuperCoinOTPModal";
import {
  cancelSuperCoinHold,
  normalizeMobileToE164,
  fetchSuperCoinConfig,
  fetchSuperCoinBrandShares,
} from "@/api/supercoinApi";
import { brandApi } from "@/lib/valuedesignApi";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { isSuperCoinExcluded } from "@/lib/supercoin-excluded-brands";

const FALLBACK = FALLBACK_IMAGE;
const SUPERCOIN_HOLD_MAP_KEY = "superCoinHoldByOrder";
const SUPERCOIN_ACTIVE_HOLD_KEY = "superCoinActiveHold";

type SuperCoinCountdownState = {
  display: string;
  minutes: string;
  seconds: string;
  expired: boolean;
};

// ── Cashback helpers (byte-identical to Cart.tsx / backend) ───────────────────
function itemCashbackScale4(lineTotal: number, pct: number): number {
  const lineTotalPaise = Math.round(lineTotal * 100);
  const pctBasis = Math.round(pct * 100);
  const product = lineTotalPaise * pctBasis;
  const q = Math.floor(product / 100);
  const r = product % 100;
  return r * 2 >= 100 ? q + 1 : q;
}

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

async function validateImage(url: string): Promise<string> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject();
      img.src = url;
      setTimeout(() => reject(), 5000);
    });
  } catch {
    return FALLBACK;
  }
}

function CartItemImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(FALLBACK);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadImage() {
      if (!src || src === FALLBACK) {
        setIsLoading(false);
        return;
      }
      try {
        const validatedUrl = await validateImage(src);
        if (isMounted) setImgSrc(validatedUrl);
      } catch {
        if (isMounted) setImgSrc(FALLBACK);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadImage();
    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
      {isLoading ? (
        <div className="animate-pulse bg-neutral-200 dark:bg-neutral-600 w-full h-full" />
      ) : (
        <img loading="lazy" decoding="async"
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-contain p-2"
          onError={() => setImgSrc(FALLBACK)}
        />
      )}
    </div>
  );
}

// Maps a fetched order's items into the CartItem rendering shape.
type CheckoutItem = {
  itemId: string;
  brandId: string;
  brandName: string;
  quantity: number;
  unitValue: number;
  lineTotal: number;
  image?: string;
};

function parseOrderMeta(meta: any): any {
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch {
      return {};
    }
  }
  return meta;
}

export default function OrderCheckout() {
  const [, params] = useRoute("/my-orders/:orderNumber/checkout");
  const orderNumber = params?.orderNumber || "";
  const { user, isAuthenticated } = useAuthContext();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const { data: walletData } = useFetchWallet(user?.clientId);

  // ── Load the single order ────────────────────────────────────────────────
  const [orderItems, setOrderItems] = useState<CheckoutItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [orderRewards, setOrderRewards] = useState({
    walletAmount: 0,
    couponDiscount: 0,
    coinsRedeemed: 0,
    netAmountPaid: null as number | null,
  });
  const [initialWalletUsed, setInitialWalletUsed] = useState(false);
  const [previousSuperCoinTxnId, setPreviousSuperCoinTxnId] = useState<string | null>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState(false);
  const [releasingPreviousHold, setReleasingPreviousHold] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderNumber) return;
    setOrderLoading(true);
    setOrderError(false);
    try {
      const details = await fetchOrderDetails(orderNumber);
      const rawItems = Array.isArray(details?.items) ? details.items : [];
      const mapped: CheckoutItem[] = rawItems.map((it: any, idx: number) => {
        const meta = parseOrderMeta(it?.meta);
        return {
          itemId: it?.orderItemId || `item-${idx}`,
          brandId: it?.brandId || meta.brand_id || "",
          brandName: meta.brand_name || `Voucher ${idx + 1}`,
          quantity: Number(it?.quantity) || 1,
          unitValue: Number(it?.unitValue) || 0,
          lineTotal: Number(it?.lineTotal) || 0,
          image: getImageUrl(meta) || FALLBACK,
        };
      });
      setOrderItems(mapped);
      setSubtotal(
        Number(details?.totalAmount) ||
          mapped.reduce((s, i) => s + i.lineTotal, 0)
      );
      setInitialWalletUsed(Boolean(details?.walletUsed));
      setOrderRewards({
        walletAmount: Number(details?.walletAmount) || 0,
        couponDiscount: Number(details?.couponDiscount) || 0,
        coinsRedeemed: Number(details?.coinsRedeemed) || 0,
        netAmountPaid: details?.netAmountPaid == null ? null : Number(details.netAmountPaid),
      });
      setPreviousSuperCoinTxnId(details?.scMerchantTxnId || null);
    } catch {
      setOrderError(true);
    } finally {
      setOrderLoading(false);
    }
  }, [orderNumber, user?.clientId]);

  useEffect(() => {
    if (isAuthenticated && orderNumber) loadOrder();
  }, [isAuthenticated, orderNumber, loadOrder]);

  // ── Platform fee config ──────────────────────────────────────────────────
  const { methods: paymentMethods, loaded: paymentMethodsLoaded } = usePaymentMethodFees();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("UPI");
  const [platformFeeConfig, setPlatformFeeConfig] = useState({
    feePercent: 0.02,
    feeMax: 20,
  });
  useEffect(() => {
    fetchPlatformFeeConfig()
      .then(setPlatformFeeConfig)
      .catch(() => {});
  }, []);

  // ── Brand discount / SuperCoin multiplier (mirrors Cart) ─────────────────
  const [brandDiscountMap, setBrandDiscountMap] = useState<Record<string, number>>({});
  const [brandSupercoinMultiplierMap, setBrandSupercoinMultiplierMap] = useState<Record<string, number>>({});
  const fetchedBrandIdsRef = useRef<Set<string>>(new Set());
  const brandIdKey = useMemo(
    () => orderItems.map((i) => i.brandId).join(","),
    [orderItems]
  );

  useEffect(() => {
    if (orderItems.length === 0) return;
    const uniqueBrandIds = [...new Set(orderItems.map((i) => i.brandId))];
    const unknownBrandIds = uniqueBrandIds.filter((id) => !fetchedBrandIdsRef.current.has(id));
    if (unknownBrandIds.length === 0) return;

    unknownBrandIds.forEach((id) => fetchedBrandIdsRef.current.add(id));
    let cancelled = false;
    Promise.all(
      unknownBrandIds.map((brandId) =>
        brandApi
          .post<{ discount?: string | number; supercoinMultiplier?: string | number } | null>(
            `/brands/${brandId}`,
            {}
          )
          .then((r) => ({
            brandId,
            discount: Number(r?.data?.discount) || 0,
            supercoinMultiplier: Number(r?.data?.supercoinMultiplier) || 1.25,
          }))
          .catch(() => ({ brandId, discount: 0, supercoinMultiplier: 1.25 }))
      )
    ).then((results) => {
      if (cancelled) return;
      setBrandDiscountMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.brandId] = r.discount;
        });
        return next;
      });
      setBrandSupercoinMultiplierMap((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.brandId] = r.supercoinMultiplier;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [brandIdKey, orderItems]);

  // ── Rewards / wallet / SuperCoin state (mirrors Cart) ────────────────────
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [rewardMode, setRewardMode] = useState<"cashbackWallet" | "superCoins">("cashbackWallet");
  const [superCoinState, setSuperCoinState] = useState({ enabled: false, eligible: false, balance: 0 });
  const [superCoinOTPModalOpen, setSuperCoinOTPModalOpen] = useState(false);
  const [superCoinAuthorized, setSuperCoinAuthorized] = useState(false);
  const [showSuperCoinRemoveDialog, setShowSuperCoinRemoveDialog] = useState(false);
  const [superCoinCapPercent, setSuperCoinCapPercent] = useState(20);
  // Per-brand SuperCoin share from the DB: 0 = excluded, 1..99 = that cap, none = global cap + built-in list.
  const [brandShareMap, setBrandShareMap] = useState<Record<string, number>>({});
  useEffect(() => {
    fetchSuperCoinBrandShares().then(setBrandShareMap);
  }, []);
  const brandCapShare = (brandId: string): number | null => {
    const s = brandShareMap[brandId];
    return typeof s === "number" && s > 0 && s < 100 ? s : null;
  };
  const isScExcluded = (brandId: string, brandName: string): boolean => {
    const s = brandShareMap[brandId];
    return typeof s === "number" && s < 100 ? s <= 0 : isSuperCoinExcluded(brandName);
  };
  useEffect(() => {
    if (rewardMode === "superCoins") {
      setUseWalletBalance(false);
    }
  }, [rewardMode]);

  useEffect(() => {
    fetchSuperCoinConfig()
      .then((config) => {
        if (typeof config.capPercent === "number" && config.capPercent > 0) {
          setSuperCoinCapPercent(config.capPercent);
        }
      })
      .catch(() => {});
  }, []);

  const [superCoinHoldContext, setSuperCoinHoldContext] = useState<SuperCoinHoldContext | null>(null);
  const [selectedSCCoins, setSelectedSCCoins] = useState(0);
  const superCoinHoldContextRef = useRef<SuperCoinHoldContext | null>(null);
  const paymentInFlightRef = useRef(false);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  // Juspay UPI-intent gateway (new); the Easebuzz retry path stays untouched.
  const [payUsingOrder, setPayUsingOrder] = useState<string | null>(null);
  const [superCoinHoldExpiryMs, setSuperCoinHoldExpiryMs] = useState<number | null>(null);
  const [transactionTime, setTransactionTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<SuperCoinCountdownState>({
    display: "15:00",
    minutes: "15",
    seconds: "00",
    expired: false,
  });
  const timerRef = useRef<number>(0);

  const superCoinMerchantWalletId =
    import.meta.env.VITE_SUPERCOIN_MERCHANT_WALLET_ID?.trim() || "";
  const normalizedSuperCoinMobile = useMemo(
    () => normalizeMobileToE164(user?.mobile),
    [user?.mobile]
  );
  const superCoinIdentity = normalizedSuperCoinMobile
    ? { identifier: normalizedSuperCoinMobile, type: "MOBILE" as const }
    : null;

  // Seed the wallet toggle once the order + wallet load (re-apply previous choice).
  const seededWalletRef = useRef(false);
  useEffect(() => {
    if (seededWalletRef.current || orderLoading || !walletData) return;
    seededWalletRef.current = true;
    setUseWalletBalance(initialWalletUsed);
  }, [orderLoading, walletData, initialWalletUsed]);

  // Per-order SuperCoin hold persistence (mirrors Cart).
  const saveSuperCoinHoldForOrder = (on: string, ctx: SuperCoinHoldContext) => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, SuperCoinHoldContext>) : {};
      current[on] = ctx;
      sessionStorage.setItem(SUPERCOIN_HOLD_MAP_KEY, JSON.stringify(current));
    } catch {}
  };
  const getSuperCoinHoldForOrder = (on: string): SuperCoinHoldContext | null => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return null;
      return (JSON.parse(raw) as Record<string, SuperCoinHoldContext>)[on] || null;
    } catch {
      return null;
    }
  };
  const clearSuperCoinHoldForOrder = (on: string) => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return;
      const current = JSON.parse(raw) as Record<string, SuperCoinHoldContext>;
      delete current[on];
      sessionStorage.setItem(SUPERCOIN_HOLD_MAP_KEY, JSON.stringify(current));
    } catch {}
  };
  const saveActiveSuperCoinHold = (ctx: SuperCoinHoldContext) => {
    try {
      sessionStorage.setItem(SUPERCOIN_ACTIVE_HOLD_KEY, JSON.stringify(ctx));
    } catch {}
  };
  const clearActiveSuperCoinHold = () => {
    try {
      sessionStorage.removeItem(SUPERCOIN_ACTIVE_HOLD_KEY);
    } catch {}
  };

  const calcCountdown = useCallback((txTime: string) => {
    const startMs = new Date(txTime).getTime();
    const endMs = startMs + 15 * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, endMs - now);
    const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    return { display: `${minutes}:${seconds}`, minutes, seconds, expired: remaining <= 0 };
  }, []);

  useEffect(() => {
    if (!superCoinAuthorized || !transactionTime) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      const next = calcCountdown(transactionTime);
      setCountdown(next);
      if (next.expired) {
        setSuperCoinAuthorized(false);
        clearActiveSuperCoinHold();
        return;
      }
      timerRef.current = window.setTimeout(tick, 1000);
    };
    tick();
    return () => {
      active = false;
      window.clearTimeout(timerRef.current);
    };
  }, [superCoinAuthorized, transactionTime, calcCountdown]);

  // ── Computations (mirror Cart exactly) ───────────────────────────────────
  const cartItems = orderItems;
  const walletBalance = walletData?.totalBalance || 0;

  const allItemsSuperCoinExcluded =
    cartItems.length > 0 && cartItems.every((item) => isScExcluded(item.brandId, item.brandName));

  const cartCashbackValueScale4 = cartItems.reduce((sum, item) => {
    const pct = brandDiscountMap[item.brandId] ?? 0;
    return sum + itemCashbackScale4(item.lineTotal, pct);
  }, 0);

  const cashbackRedeemPercent = walletData?.cashbackRedeemPercent ?? 50;
  const maxRedeemAmount = walletData?.maxRedeemAmount ?? 100;
  const maxWalletUsage =
    walletCapPaise(cartCashbackValueScale4, cashbackRedeemPercent, maxRedeemAmount) / 100;

  const walletDeduction = useWalletBalance ? Math.min(walletBalance, maxWalletUsage) : 0;

  const discountsLoaded = cartItems.every(
    (item) => brandDiscountMap[item.brandId] !== undefined
  );

  let totalRupeeCap = 0;
  let totalCoinCap = 0;
  if (discountsLoaded) {
    cartItems
      .filter((item) => !isScExcluded(item.brandId, item.brandName))
      .forEach((item) => {
        const itemTotal = item.quantity * item.unitValue;
        const multiplier = brandSupercoinMultiplierMap[item.brandId] ?? 1.25;
        const itemRupeeCap = itemTotal * ((brandCapShare(item.brandId) ?? superCoinCapPercent) / 100);
        const itemCoinCap = Math.ceil(itemRupeeCap * multiplier);
        totalRupeeCap += itemRupeeCap;
        totalCoinCap += itemCoinCap;
      });
  }
  const maxSuperCoinRedeemable = discountsLoaded ? totalCoinCap : superCoinState.balance;
  const effectiveSupercoinMultiplier = totalRupeeCap > 0 ? totalCoinCap / totalRupeeCap : 1.25;
  // Cap percent to DISPLAY: the brand's own DB share (lowest across the cart), else the global cap.
  // Same rule as the cap maths above, so the label always matches what can actually be applied.
  const displayCapPercent = (() => {
    const caps = cartItems
      .filter((item) => !isScExcluded(item.brandId, item.brandName))
      .map((item) => brandCapShare(item.brandId) ?? superCoinCapPercent);
    return caps.length > 0 ? Math.min(...caps) : superCoinCapPercent;
  })();

  const maxSCCoins = Math.max(0, Math.min(superCoinState.balance, maxSuperCoinRedeemable));
  useEffect(() => {
    if (maxSCCoins < 1) {
      setSelectedSCCoins(0);
      return;
    }
    setSelectedSCCoins((prev) => (prev < 1 ? maxSCCoins : Math.min(prev, maxSCCoins)));
  }, [maxSCCoins]);

  const superCoinDeduction =
    !allItemsSuperCoinExcluded && superCoinAuthorized && superCoinState.eligible
      ? Math.min(
          superCoinHoldContext?.amount ?? superCoinState.balance,
          maxSuperCoinRedeemable,
          superCoinState.balance
        ) / effectiveSupercoinMultiplier
      : 0;

  // Cash the customer pays before the platform fee.
  const cashBeforeFee = Math.max(
    0,
    subtotal - orderRewards.couponDiscount - walletDeduction - superCoinDeduction
  );
  // Method-based fee on that cash (DB-backed). If the fee list could not load,
  // fall back to the legacy fee, which the backend also uses when no method is sent.
  const activePaymentMethod = paymentMethods.find((m) => m.code === selectedPaymentMethod) ?? paymentMethods[0];
  const useMethodFee = paymentMethodsLoaded && paymentMethods.length > 0;
  const PLATFORM_FEE = useMethodFee
    ? computeMethodFee(activePaymentMethod, cashBeforeFee)
    : superCoinDeduction > 0
      ? Number(
          Math.min(subtotal * platformFeeConfig.feePercent, platformFeeConfig.feeMax).toFixed(2)
        )
      : 0;

  const finalPayable = cashBeforeFee + PLATFORM_FEE;
  const uiTotalToPay = Number(finalPayable.toFixed(2));
  // SuperCoins earned: computed by the backend with the same rule it credits by
  // (per-brand earn percent, else the global rate) on the cash paid, never on the fee.
  const earnEstimate = useSuperCoinEarnEstimate(
    cartItems.map((i) => ({ brandId: i.brandId, lineTotal: i.lineTotal })),
    cashBeforeFee,
    rewardMode === "superCoins"
  );
  const estimatedEarn = earnEstimate ?? 0;

  const cashbackPercent = useMemo(() => {
    if (!cartItems.length) return 0;
    const totalLine = cartItems.reduce((s, i) => s + i.lineTotal, 0);
    if (totalLine <= 0) return 0;
    return cartItems.reduce((sum, item) => {
      const disc = brandDiscountMap[item.brandId] ?? 0;
      return sum + (item.lineTotal / totalLine) * disc;
    }, 0);
  }, [cartItems, brandDiscountMap]);
  // Cashback is on the voucher cash paid, not the platform fee (matches the credit trigger).
  const cashbackAmount = cashBeforeFee * (cashbackPercent / 100);

  const brandTotals = cartItems.reduce((acc, item) => {
    const key = `${item.brandId}-${item.unitValue}`;
    const discount = brandDiscountMap[item.brandId] ?? 0;
    if (acc[key]) {
      acc[key].quantity += item.quantity;
      acc[key].total += item.lineTotal;
    } else {
      acc[key] = {
        brand: item.brandName,
        brandId: item.brandId,
        quantity: item.quantity,
        price: item.unitValue,
        total: item.lineTotal,
        discount,
      };
    }
    return acc;
  }, {} as Record<string, { brand: string; brandId: string; quantity: number; price: number; total: number; discount: number }>);

  const buildPaymentBreakdown = (walletEnabled: boolean, superCoinEnabled = superCoinAuthorized) => {
    const currentWalletDeduction = walletEnabled ? Math.min(walletBalance, maxWalletUsage) : 0;
    const currentSuperCoinDeduction =
      !allItemsSuperCoinExcluded && superCoinEnabled && superCoinState.eligible
        ? Math.min(
            superCoinHoldContext?.amount ?? superCoinState.balance,
            maxSuperCoinRedeemable,
            superCoinState.balance
          ) / effectiveSupercoinMultiplier
        : 0;
      const currentFinalPayable = Math.max(
        0,
        subtotal - orderRewards.couponDiscount - currentWalletDeduction - currentSuperCoinDeduction
      );
      return {
        subtotal,
        walletDeduction: currentWalletDeduction,
        superCoinDeduction: currentSuperCoinDeduction,
        couponDiscount: orderRewards.couponDiscount,
        finalPayable: currentFinalPayable,
      };
  };

  // ── SuperCoin hold / unhold / switch (mirror Cart) ───────────────────────
  const persistSuperCoinHoldForPayment = (on: string, superCoinAmount: number) => {
    if (!superCoinAuthorized || superCoinAmount <= 0) return;
    const holdContext = superCoinHoldContextRef.current || superCoinHoldContext;
    if (!holdContext) return;
    saveSuperCoinHoldForOrder(on, holdContext);
  };

  const cancelSuperCoinHoldIfNeeded = async (on?: string) => {
    superCoinHoldContextRef.current = null;
    setSuperCoinHoldContext(null);
    setSuperCoinHoldExpiryMs(null);
    clearActiveSuperCoinHold();
    if (on) clearSuperCoinHoldForOrder(on);
  };

  const unholdSuperCoin = async (on?: string) => {
    const activeHoldContext =
      superCoinHoldContextRef.current ||
      superCoinHoldContext ||
      (on ? getSuperCoinHoldForOrder(on) : null);
    const merchantTransactionId = activeHoldContext?.merchantTransactionId || previousSuperCoinTxnId;
    if (!merchantTransactionId || !superCoinIdentity) return;
    try {
      await cancelSuperCoinHold({
        identity: superCoinIdentity,
        merchantTransactionId,
        merchantWalletId: activeHoldContext?.merchantWalletId || superCoinMerchantWalletId,
      });
      trackEvent("supercoin_removed", {
        coins: activeHoldContext?.amount ?? orderRewards.coinsRedeemed,
        transaction_id: on || orderNumber || undefined,
      });
    } catch (error) {
      console.warn("Failed to cancel SuperCoin hold", error);
    } finally {
      superCoinHoldContextRef.current = null;
      setSuperCoinHoldContext(null);
      setSuperCoinHoldExpiryMs(null);
      clearActiveSuperCoinHold();
      clearSuperCoinHoldForOrder(on || orderNumber || "");
      setPreviousSuperCoinTxnId(null);
      setOrderRewards((previous) => ({ ...previous, coinsRedeemed: 0 }));
    }
  };

  const requestSwitchToCashback = useCallback(() => {
    if (superCoinAuthorized || previousSuperCoinTxnId) {
      setShowSuperCoinRemoveDialog(true);
      return;
    }

    setRewardMode("cashbackWallet");
  }, [superCoinAuthorized, previousSuperCoinTxnId]);

  // The order already exists — no ensureOrder needed; key the hold to it.
  const openSuperCoinFlow = useCallback(async () => {
    if (!superCoinIdentity || !orderNumber) return;

    // Re-checkout orders can retain an old DB hold reference after the
    // 15-minute Flipkart hold expires. Release/clear that pending-order hold
    // before the OTP modal creates a fresh hold for this same order number.
    if (previousSuperCoinTxnId) {
      setReleasingPreviousHold(true);
      try {
        await cancelSuperCoinHold({
          identity: superCoinIdentity,
          merchantTransactionId: previousSuperCoinTxnId,
          merchantWalletId: superCoinMerchantWalletId,
        });
        setPreviousSuperCoinTxnId(null);
        clearSuperCoinHoldForOrder(orderNumber);
        clearActiveSuperCoinHold();
        superCoinHoldContextRef.current = null;
        setSuperCoinHoldContext(null);
        setSuperCoinAuthorized(false);
        setSuperCoinHoldExpiryMs(null);
        setTransactionTime(null);
      } catch (error) {
        const responseMessage = (error as any)?.response?.data?.message;
        toast({
          title: "Could not reset SuperCoins",
          description: responseMessage || "Please try again before applying SuperCoins.",
          variant: "destructive",
        });
        return;
      } finally {
        setReleasingPreviousHold(false);
      }
    }

    setSuperCoinOTPModalOpen(true);
  }, [superCoinIdentity, orderNumber, previousSuperCoinTxnId, superCoinMerchantWalletId, toast]);

  // ── Pay orchestration (mirrors Cart minus order creation) ────────────────
  const isProcessing = isRetryingPayment;

  const lastPrepRef = useRef<{
    selectedWalletUsage: boolean;
    walletDeduction: number;
    finalPayable: number;
  } | null>(null);

  const preparePayment = async () => {
    const selectedWalletUsage = rewardMode === "cashbackWallet" && useWalletBalance;
    const paymentBreakdown = buildPaymentBreakdown(selectedWalletUsage);
    await persistSuperCoinHoldForPayment(orderNumber, paymentBreakdown.superCoinDeduction);
    if (rewardMode === "cashbackWallet" && previousSuperCoinTxnId) {
      await unholdSuperCoin(orderNumber);
    }
    const prep = {
      selectedWalletUsage,
      walletDeduction: paymentBreakdown.walletDeduction,
      finalPayable: paymentBreakdown.finalPayable,
    };
    lastPrepRef.current = prep;
    return prep;
  };

  const initiateEasebuzz = async (
    methodCode: string | undefined,
    prep: { selectedWalletUsage: boolean; walletDeduction: number; finalPayable: number }
  ) => {
    const response = await initiateRetryPayment(
      orderNumber,
      prep.selectedWalletUsage,
      prep.walletDeduction,
      rewardMode === "cashbackWallet",
      useMethodFee ? methodCode : undefined,
      // UPI is handled by Juspay; never offer it on the Easebuzz checkout.
      useMethodFee ? easebuzzPaymentModes(paymentMethods) : undefined
    );
    const paymentUrl = response.payment_url || response.paymentUrl || response.data;
    if (!(response.status === 1 || response.status === true) || !paymentUrl) {
      throw new Error(response.message || "Unable to initiate payment. Please try again.");
    }
    paymentInFlightRef.current = true;
    clearActiveSuperCoinHold();
    trackEvent("payment_initiated", {
      value: prep.finalPayable,
      currency: "INR",
      transaction_id: orderNumber,
      gateway: "sabbpe",
    });
    window.location.href = paymentUrl;
  };

  const handlePayNow = async (
    choice: 'EASEBUZZ' | 'CHOOSE' = 'EASEBUZZ',
    methodCode?: string
  ) => {
    if (!isAuthenticated) {
      toast({ title: "Login required", description: "Please login to place an order", variant: "destructive" });
      setLocation("/login");
      return;
    }
    if (!user?.clientId) {
      toast({ title: "Error", description: "User client ID not found. Please login again.", variant: "destructive" });
      return;
    }
    try {
      setIsRetryingPayment(true);
      setPaymentSheetOpen(true);
      const prep = await preparePayment();
      if (choice === "CHOOSE") {
        // UPI intent / card chooser: opened after the SuperCoin hold is in place.
        setPaymentSheetOpen(false);
        setIsRetryingPayment(false);
        setPayUsingOrder(orderNumber);
        return;
      }
      await initiateEasebuzz(methodCode ?? activePaymentMethod?.code, prep);
    } catch (error) {
      await cancelSuperCoinHoldIfNeeded(orderNumber);
      toast({
        title: "Checkout Failed",
        description:
          (error as any)?.response?.data?.message ||
          (error as Error)?.message ||
          "Failed to continue checkout. Please try again.",
        variant: "destructive",
      });
      setPaymentSheetOpen(false);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  // The chooser already ran preparePayment, so pay the chosen card method directly.
  const handleCardMethod = async (code: string) => {
    setPayUsingOrder(null);
    const prep = lastPrepRef.current;
    if (!prep) {
      void handlePayNow("EASEBUZZ", code);
      return;
    }
    setIsRetryingPayment(true);
    try {
      await initiateEasebuzz(code, prep);
    } catch (error) {
      await cancelSuperCoinHoldIfNeeded(orderNumber);
      toast({
        title: "Checkout Failed",
        description:
          (error as any)?.response?.data?.message ||
          (error as Error)?.message ||
          "Failed to continue checkout. Please try again.",
        variant: "destructive",
      });
      setPaymentSheetOpen(false);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  // ── Auth / loading / error gates ─────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-hero-aurora">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-amber-300" />
            </div>
            <h2 className="text-xl font-extrabold mb-2 text-gold-gradient">Please Login</h2>
            <p className="text-white/65 text-sm font-medium mb-6">Login to complete your order</p>
            <Button onClick={() => setLocation("/login")} className="rounded-2xl font-bold px-8 h-12 bg-gold-gradient text-amber-950 hover:opacity-90">
              Sign In
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="cart-color-system cart-page min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0" style={{ backgroundColor: "#f3f5f9" }} />
      <Header />
      <main className="flex-1 pb-24 md:pb-10 relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <button
            onClick={() => setLocation("/my-orders")}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] shadow-sm mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Orders
          </button>

          {orderLoading && (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-28 g-skeleton rounded-3xl" />)}</div>
          )}

          {!orderLoading && orderError && (
            <div className="text-center py-16">
              <p className="font-bold mb-1">Can't view this order</p>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>
                This order could not be loaded.
              </p>
              <Button onClick={() => setLocation("/my-orders")} className="rounded-2xl font-bold">
                Back to Orders
              </Button>
            </div>
          )}

          {!orderLoading && !orderError && (
            <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Cart Items (read-only — fixed order) */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                <h1 className="text-xl sm:text-2xl font-extrabold cart-text-primary">
                  Order Details
                </h1>
                <p className="text-xs sm:text-sm cart-text-secondary -mt-2">
                  Order <span className="font-mono font-semibold">{orderNumber}</span>
                </p>
                {cartItems.map((item) => (
                  <div key={item.itemId} className="cart-surface rounded-3xl p-4 sm:p-6 shadow-[0_12px_32px_rgba(108,92,231,0.12)]">
                    <div className="flex gap-4 sm:gap-6">
                      <CartItemImage src={item.image} alt={item.brandName} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-2 sm:mb-3">
                          <div>
                            <h3 className="font-bold text-base sm:text-lg mb-0.5 sm:mb-1 cart-text-primary">
                              {item.brandName}
                            </h3>
                            <p className="text-xs sm:text-sm cart-text-secondary">
                              ₹{item.unitValue.toFixed(2)} each
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="h-8 w-8 rounded-lg border border-[var(--cart-secondary)] bg-[rgba(162,155,254,0.12)] cart-text-primary flex items-center justify-center opacity-60">
                              <Minus className="h-3 w-3" />
                            </span>
                            <span className="w-7 text-center font-bold text-sm sm:text-base cart-text-primary">
                              {item.quantity}
                            </span>
                            <span className="h-8 w-8 rounded-lg border border-[var(--cart-secondary)] bg-[rgba(162,155,254,0.12)] cart-text-primary flex items-center justify-center opacity-60">
                              <Plus className="h-3 w-3" />
                            </span>
                          </div>
                          <p className="text-lg sm:text-xl font-extrabold text-[var(--cart-primary)]">
                            ₹{item.lineTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="cart-surface sticky top-20 rounded-3xl border-0 shadow-[0_20px_45px_rgba(108,92,231,0.12)]">
                  <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <h2 className="text-xl sm:text-2xl font-extrabold cart-text-primary">Order Summary</h2>

                    <div className="space-y-2 sm:space-y-3">
                      {Object.entries(brandTotals).map(([key, data]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm cart-text-secondary">
                            {data.brand}
                            {data.discount > 0 && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-green-600 dark:text-green-400">
                                {data.discount}% Cashback
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-xs sm:text-sm cart-text-primary">
                            {data.quantity} × ₹{data.price.toFixed(2)} = ₹{data.total.toFixed(2)}
                          </span>
                        </div>
                      ))}

                      <Separator className="my-3 sm:my-4" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          <div className="relative flex items-center rounded-full bg-muted p-1">
                            <button
                              type="button"
                              onClick={() => requestSwitchToCashback()}
                              className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                                rewardMode === "cashbackWallet" || allItemsSuperCoinExcluded
                                  ? "bg-[#34D399] shadow-sm text-white font-semibold"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Sparkles className="h-4 w-4" />
                              Cashback &amp; Wallet
                            </button>
                            {!allItemsSuperCoinExcluded && (
                              <button
                                type="button"
                                onClick={() => setRewardMode("superCoins")}
                                className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                                  rewardMode === "superCoins"
                                    ? "bg-[#34D399] shadow-sm text-white font-semibold"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                                SuperCoins
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          {rewardMode === "cashbackWallet" && (
                            <div className="space-y-3">
                              <div className="p-3 sm:p-4 rounded-xl border bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.25)]">
                                <p className="text-sm sm:text-base font-medium cart-text-primary">
                                  Earn Cashback
                                  {cashbackPercent > 0 && (
                                    <span className="ml-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                      ({cashbackPercent.toFixed(0)}%)
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs cart-text-primary mt-0.5">
                                  Earn ₹{cashbackAmount.toFixed(2)} in cashback after purchase
                                </p>
                              </div>

                              <div
                                role="radio"
                                aria-checked={useWalletBalance}
                                tabIndex={0}
                                onClick={() => setUseWalletBalance(!useWalletBalance)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setUseWalletBalance(!useWalletBalance);
                                  }
                                }}
                                className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-200 ease-in-out outline-none cursor-pointer ${
                                  useWalletBalance
                                    ? "bg-[rgba(151,71,255,0.08)] border-l-[3px] border-l-[var(--cart-primary)] border-t border-r border-b border-t-[rgba(151,71,255,0.3)] border-r-[rgba(151,71,255,0.3)] border-b-[rgba(151,71,255,0.3)]"
                                    : "bg-[rgba(151,71,255,0.05)] border-[rgba(151,71,255,0.2)]"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                                      useWalletBalance
                                        ? "border-[var(--cart-primary)] bg-[var(--cart-primary)]"
                                        : "border-muted-foreground/40 bg-transparent"
                                    }`}
                                  >
                                    {useWalletBalance && <span className="h-2 w-2 rounded-full bg-white" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <Wallet
                                        className={`h-4 w-4 ${
                                          useWalletBalance ? "text-[var(--cart-primary)]" : "text-[var(--cart-primary)]/70"
                                        }`}
                                      />
                                      <span className="text-sm sm:text-base font-medium cart-text-primary">
                                        Redeem Wallet Points
                                      </span>
                                    </div>
                                    <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                                      Available: ₹{walletBalance.toFixed(2)} • Max: ₹{maxWalletUsage.toFixed(2)} (based on this order's cashback)
                                    </p>
                                    {walletBalance <= 0 && (
                                      <p className="text-xs text-muted-foreground/60 mt-1 italic">
                                        No wallet balance available
                                      </p>
                                    )}
                                    {useWalletBalance && walletDeduction > 0 && (
                                      <p className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                                        -₹{walletDeduction.toFixed(2)} will be deducted
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {rewardMode === "superCoins" && !allItemsSuperCoinExcluded && (
                            <div className="space-y-3">
                              <SuperCoinStatusCard
                                mobile={user?.mobile}
                                enabled={superCoinAuthorized}
                                maxRedeemable={maxSuperCoinRedeemable}
                                estimatedEarn={estimatedEarn}
                                hideToggle
                                coinsOnHold={superCoinAuthorized && superCoinHoldContext ? (superCoinHoldContext.amount ?? 0) : 0}
                                supercoinMultiplier={effectiveSupercoinMultiplier}
                                onStateChange={({ eligible, balance, enabled }) =>
                                  setSuperCoinState({ eligible, balance, enabled })
                                }
                              />

                              {!superCoinAuthorized ? (
                                <>
                                  {maxSCCoins >= 1 && (
                                    <div className="space-y-2 rounded-lg border border-[rgba(151,71,255,0.25)] bg-[rgba(151,71,255,0.06)] px-3 py-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-[#7C3AED] flex items-center gap-1.5">
                                          <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4 inline" />
                                          Coins to use
                                        </span>
                                        <span className="text-sm font-bold text-[#7C3AED]">
                                          {selectedSCCoins} SC
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={1}
                                        max={maxSCCoins}
                                        step={1}
                                        value={Math.min(Math.max(selectedSCCoins, 1), maxSCCoins)}
                                        onChange={(e) => setSelectedSCCoins(Number(e.target.value))}
                                        aria-label="SuperCoins to use"
                                        className="sc-coin-slider h-2 w-full cursor-pointer appearance-none rounded-full outline-none"
                                        style={{
                                          background: `linear-gradient(to right, #9747FF 0%, #9747FF ${
                                            maxSCCoins > 1
                                              ? ((Math.min(Math.max(selectedSCCoins, 1), maxSCCoins) - 1) / (maxSCCoins - 1)) * 100
                                              : 100
                                          }%, rgba(151,71,255,0.2) ${
                                            maxSCCoins > 1
                                              ? ((Math.min(Math.max(selectedSCCoins, 1), maxSCCoins) - 1) / (maxSCCoins - 1)) * 100
                                              : 100
                                          }%, rgba(151,71,255,0.2) 100%)`,
                                        }}
                                      />
                                      <div className="flex items-center justify-between gap-2 text-xs">
                                        <span className="font-medium text-[#7C3AED]">
                                          Save ₹{(selectedSCCoins / effectiveSupercoinMultiplier).toFixed(2)}
                                        </span>
                                        <span className="text-muted-foreground">
                                          Max {maxSCCoins} SC · {displayCapPercent}% of voucher value
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  <Button
                                    className="w-full cart-gradient-fill h-11"
                                    disabled={releasingPreviousHold || superCoinState.balance <= 0 || maxSCCoins < 1 || selectedSCCoins < 1}
                                    onClick={() => openSuperCoinFlow()}
                                  >
                                    {releasingPreviousHold ? "Releasing previous hold..." : "Apply SuperCoins"}
                                  </Button>
                                </>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[rgba(151,71,255,0.08)] border border-[rgba(151,71,255,0.25)]">
                                    <span className="text-sm font-medium text-[#7C3AED] flex items-center gap-1.5">
                                      SuperCoins active
                                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                                    </span>
                                    <button
                                      type="button"
                                      className="text-xs font-medium text-[#7C3AED] hover:text-[#6D28D9] underline"
                                      onClick={async () => {
                                        await unholdSuperCoin(orderNumber);
                                        setRewardMode("cashbackWallet");
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  {transactionTime && !countdown.expired && (
                                    <p className="px-3 text-xs sm:text-sm font-medium text-[#7C3AED] flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      Use your SuperCoins within {countdown.display}
                                    </p>
                                  )}
                                  {countdown.expired && (
                                    <p className="px-3 text-xs sm:text-sm font-medium text-red-500">
                                      SuperCoin hold expired. Please apply again.
                                    </p>
                                  )}
                                  {superCoinDeduction > 0 && (
                                    <p className="text-xs text-[#7C3AED] font-medium px-3">
                                      Saving ₹{superCoinDeduction.toFixed(2)} on this order
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator className="my-3 sm:my-4" />

                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base cart-text-secondary">Subtotal</span>
                        <span className="font-medium text-sm sm:text-base cart-text-primary">
                          ₹{subtotal.toFixed(2)}
                        </span>
                      </div>

                      {walletDeduction > 0 && (
                        <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                          <span className="text-sm sm:text-base flex items-center gap-1">
                            <Wallet className="h-4 w-4" />
                            Wallet Points Used
                          </span>
                          <span className="font-medium text-sm sm:text-base">-₹{walletDeduction.toFixed(2)}</span>
                        </div>
                      )}

                      {superCoinAuthorized && superCoinHoldContext && (
                        <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400">
                          <span className="text-sm sm:text-base flex items-center gap-1.5">
                            SuperCoins Redeemed
                            <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                          </span>
                          <span className="font-medium text-sm sm:text-base">{superCoinHoldContext.amount} SC</span>
                        </div>
                      )}

                      {orderRewards.couponDiscount > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm sm:text-base cart-text-secondary">Coupon Discount</span>
                          <span className="font-medium text-sm sm:text-base cart-text-primary">-₹{orderRewards.couponDiscount.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {PLATFORM_FEE > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm sm:text-base cart-text-secondary">
                          Platform Fee{useMethodFee && activePaymentMethod ? ` (${activePaymentMethod.label})` : ""}
                        </span>
                        <span className="font-medium text-sm sm:text-base cart-text-primary">₹{PLATFORM_FEE.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-base sm:text-lg font-bold cart-text-primary">Pay Now</span>
                        <div className="text-right">
                          <span className="text-2xl sm:text-3xl font-extrabold text-[var(--cart-primary)]">
                           ₹{uiTotalToPay.toFixed(2)}
                          </span>
                        </div>
                      </div>

                    <PayUsingField
                      label={activePaymentMethod?.label ?? "UPI"}
                      subtext={payMethodSubtext(activePaymentMethod?.code)}
                      amountLabel={`Pay ₹${uiTotalToPay.toFixed(2)}`}
                      onClick={() => void handlePayNow("CHOOSE")}
                      disabled={isProcessing || orderLoading || cartItems.length === 0}
                      loading={isProcessing}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <AlertDialog
        open={showSuperCoinRemoveDialog}
        onOpenChange={(open) => !open && setShowSuperCoinRemoveDialog(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your SuperCoins from this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              Your reserved SuperCoins will not be used for this payment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSuperCoinRemoveDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowSuperCoinRemoveDialog(false);
                await unholdSuperCoin(orderNumber);
                setRewardMode("cashbackWallet");
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
      <MobileBottomNav />

      <PaymentFlowSheet open={paymentSheetOpen} state="loading" />

      <PayUsingSheet
        open={!!payUsingOrder}
        orderNumber={payUsingOrder ?? ""}
        cashAmount={cashBeforeFee}
        methods={paymentMethods}
        amountLabel={`₹${uiTotalToPay.toFixed(2)}`}
        onClose={() => setPayUsingOrder(null)}
        onLeavePending={() => {
          setPayUsingOrder(null);
          window.location.assign("/orders");
        }}
        onPaid={() => {
          setPayUsingOrder(null);
          window.location.assign("/orders");
        }}
        onCardMethod={(code) => {
          setSelectedPaymentMethod(code);
          void handleCardMethod(code);
        }}
        onFallbackToOtherMethods={(code) => {
          const fallback =
            code ?? paymentMethods.find((m) => !isUpiPaymentMethod(m.code))?.code;
          if (fallback) {
            setSelectedPaymentMethod(fallback);
            void handleCardMethod(fallback);
          }
        }}
      />

      {superCoinIdentity && (
        <SuperCoinOTPModal
          open={superCoinOTPModalOpen}
          onClose={() => setSuperCoinOTPModalOpen(false)}
          onAuthorized={(context) => {
            superCoinHoldContextRef.current = context;
            setSuperCoinHoldContext(context);
            setSuperCoinAuthorized(true);
            setSuperCoinHoldExpiryMs(context.stampExpiry ?? Date.now() + 15 * 60 * 1000);
            setTransactionTime(
              context.transactionTime ??
                new Date((context.stampExpiry ?? Date.now() + 15 * 60 * 1000) - 15 * 60 * 1000).toISOString()
            );
            saveActiveSuperCoinHold(context);
            if (orderNumber) saveSuperCoinHoldForOrder(orderNumber, context);
            setSuperCoinOTPModalOpen(false);
            trackEvent("supercoin_applied", {
              coins: context.amount,
              transaction_id: orderNumber || undefined,
            });
          }}
          onSwitchToCashback={() => {
            setSuperCoinOTPModalOpen(false);
            requestSwitchToCashback();
          }}
          identity={superCoinIdentity}
          merchantWalletId={superCoinMerchantWalletId}
          orderNumber={orderNumber}
          displayName={user?.name || "Gift360 Checkout"}
          preloadedBalance={superCoinState.balance}
          maxRedeemable={maxSuperCoinRedeemable}
          initialCoinAmount={selectedSCCoins}
        />
      )}
    </div>
  );
}
