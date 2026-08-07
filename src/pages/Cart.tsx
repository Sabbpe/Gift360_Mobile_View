// pages/CartPage.tsx - Complete responsive implementation
import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useInitiatePayment } from "@/hooks/useInitiatePayment";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Trash2, ShoppingBag, Ticket, CreditCard, CalendarDays, Loader2, Sparkles, Check, Clock } from "lucide-react";
import { useExternalScript } from "@/hooks/useExternalScript";
import { useGeneratePaymentToken } from "@/hooks/useGeneratePaymentToken";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { Wallet } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useValidateOrder } from "@/hooks/useValidateOrder";
import { encrypt } from "@/utils/encryption";
import { useCart } from "@/hooks/useCart";
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
import { useEasebuzzScript } from "@/hooks/useEasebuzzScript";
import { useEasebuzzInitiatePayment } from "@/hooks/useEasebuzzInitiatePayment";
import { useValidateCoupon } from "@/hooks/useValidateCoupon";
import { CouponValidationError } from "@/api/couponApi";
import CartTabs from "@/components/CartTabs";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import PaymentFlowSheet from "@/components/PaymentFlowSheet";
import SuperCoinStatusCard from "@/components/SuperCoinStatusCard";
import SuperCoinOTPModal, {
  type SuperCoinHoldContext,
} from "@/components/SuperCoinOTPModal";
import {
  cancelSuperCoinHold,
  normalizeMobileToE164,
} from "@/api/supercoinApi";
import { brandApi } from "@/lib/valuedesignApi";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { isSuperCoinExcluded } from "@/lib/supercoin-excluded-brands";

const FALLBACK = FALLBACK_IMAGE;
const COUPON_RESERVATION_MAP_KEY = "couponReservationByOrder";
const SUPERCOIN_HOLD_MAP_KEY = "superCoinHoldByOrder";
const SUPERCOIN_ACTIVE_HOLD_KEY = "superCoinActiveHold";

type SuperCoinCountdownState = {
  display: string;
  minutes: string;
  seconds: string;
  expired: boolean;
};

// Image validation function
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

// Component to handle image loading
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
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-contain p-2"
          onError={() => setImgSrc(FALLBACK)}
        />
      )}
    </div>
  );
}

const getGuestCartCount = (): number => {
  try {
    const stored = localStorage.getItem("guestCart");
    if (!stored) return 0;
    const items = JSON.parse(stored) as Array<{ quantity: number }>;
    return items.reduce((sum, item) => sum + item.quantity, 0);
  } catch {
    return 0;
  }
};

const getOrderItemImage = (item: any): string => {
  return getImageUrl(item) || FALLBACK;
};

const mapVoucherOrder = (order: any) => {
  const mappedItems = Array.isArray(order?.items)
    ? order.items.map((item: any) => {
        const groups = Array.isArray(item?.gift_voucher_item_coupon_details)
          ? item.gift_voucher_item_coupon_details
          : [];
        const coupons = groups.map((group: any) => ({
          coupon_id: group?.coupon_id || "",
          vd_raw_response: {
            brand_details: [
              {
                product_name: item?.meta?.brand_name || "",
                items: Array.isArray(group?.items) ? group.items : [],
              },
            ],
          },
        }));

        return { ...item, coupons, meta: item?.meta || {} };
      })
    : [];

  return {
    ...order,
    items: mappedItems,
    total_amount: Number(
      order?.pricing?.final_payable ??
        order?.pricing?.subtotal ??
        order?.total_amount ??
        0
    ),
  };
};

export default function Cart() {
  const { user, isAuthenticated } = useAuthContext();
  const guestCartCount = !isAuthenticated ? getGuestCartCount() : 0;
  const {
    cart,
    isLoading: cartLoading,
    isError: cartError,
    updateQuantity,
    removeFromCart,
    clearCart,
    generateOrderRequest,
  } = useCart(user?.clientId);
  const createOrderMutation = useCreateOrder();
  const generateTokenMutation = useGeneratePaymentToken();
  const paymentMutation = useInitiatePayment();
  const validateOrderMutation = useValidateOrder();

  const easebuzzPaymentMutation = useEasebuzzInitiatePayment();

  const scriptStatus = useExternalScript(import.meta.env.VITE_ATOM_SCRIPT_URL);
  const easebuzzScriptStatus = useEasebuzzScript();

  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const autoPayTriggeredRef = useRef(false);
  const [voucherOrders, setVoucherOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const [itemToDelete, setItemToDelete] = useState<{
    itemId: string;
    brandName: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"cart" | "voucher">("cart");
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAmount, setSheetAmount] = useState<number | undefined>(undefined);
  const [sheetQuantity, setSheetQuantity] = useState<number | undefined>(undefined);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);

  // NEW: Wallet feature
  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [earnCashback, setEarnCashback] = useState(true);
  const [rewardMode, setRewardMode] = useState<'cashbackWallet' | 'superCoins'>('cashbackWallet');
  const [superCoinState, setSuperCoinState] = useState({
    enabled: false,
    eligible: false,
    balance: 0,
  });
  const [superCoinOTPModalOpen, setSuperCoinOTPModalOpen] = useState(false);
  const [superCoinAuthorized, setSuperCoinAuthorized] = useState(false);
  const [superCoinHoldContext, setSuperCoinHoldContext] = useState<SuperCoinHoldContext | null>(null);
  const superCoinHoldContextRef = useRef<SuperCoinHoldContext | null>(null);
  const paymentInFlightRef = useRef(false);
  const [showSuperCoinRemoveDialog, setShowSuperCoinRemoveDialog] = useState(false);
  const [superCoinOrderNumber, setSuperCoinOrderNumber] = useState("");
  const [superCoinHoldExpiryMs, setSuperCoinHoldExpiryMs] = useState<number | null>(null);
  const [transactionTime, setTransactionTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<SuperCoinCountdownState>({
    display: "15:00",
    minutes: "15",
    seconds: "00",
    expired: false,
  });
  const timerRef = useRef<number>(0);
  const { data: walletData } = useFetchWallet(user?.clientId);
  const superCoinMerchantWalletId =
    import.meta.env.VITE_SUPERCOIN_MERCHANT_WALLET_ID?.trim() || "";
  const normalizedSuperCoinMobile = useMemo(
    () => normalizeMobileToE164(user?.mobile),
    [user?.mobile]
  );
  const superCoinIdentity = normalizedSuperCoinMobile
    ? {
        identifier: normalizedSuperCoinMobile,
        type: "MOBILE" as const,
      }
    : null;

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

  // Dependency: rewardMode drives wallet/cashback/supercoin toggles
  useEffect(() => {
    if (rewardMode === 'superCoins') {
      setUseWalletBalance(false);
      setEarnCashback(false);
    } else {
      if (superCoinHoldContextRef.current) {
        cancelSuperCoinHoldIfNeeded();
      }
      setEarnCashback(true);
      setSuperCoinAuthorized(false);
      superCoinHoldContextRef.current = null;
      setSuperCoinHoldContext(null);
      setSuperCoinHoldExpiryMs(null);
      setSuperCoinOTPModalOpen(false);
      setSuperCoinState(prev => ({ ...prev, enabled: false }));
    }
  }, [rewardMode]);

  // Coupon code feature
  const [couponCode, setCouponCode] = useState("");
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [corporateIdInput, setCorporateIdInput] = useState("");
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    orderId: null,
    orderNumber: null,
    reservationId: null,
    couponCode: "",
    couponApplied: false,
    couponError: null,
    discount: 0,
    finalAmount: null,
    cartSignature: "",
  });
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    coupon_id: string;
    reservationId: string;
    discountAmount: number;
    finalAmount: number;
  } | null>(null);
  const validateCouponMutation = useValidateCoupon();

  const normalizedCouponCode = couponCode.trim().toUpperCase();
  const isEmployeeCoupon = normalizedCouponCode.startsWith("EMP") || normalizedCouponCode.startsWith("EMPID");
  const isCorporateCoupon = normalizedCouponCode.startsWith("CORP") || normalizedCouponCode.startsWith("CORPID");
  const couponType = isEmployeeCoupon ? "EMP" : isCorporateCoupon ? "CORP" : "NORMAL";
  const previousCouponType = useRef(couponType);
  const lastCheckoutCartSignatureRef = useRef("");
  const fetchVoucherOrders = useCallback(async () => {
    if (!user?.clientId) {
      setVoucherOrders([]);
      return;
    }

    setOrdersLoading(true);
    try {
      const response = await brandApi.post("/v1/neworders", {
        clientId: user.clientId,
        timeline: 12,
      });
      const rawOrders = Array.isArray(response?.data?.orders)
        ? response.data.orders
        : [];

      setVoucherOrders(
        rawOrders
          .map(mapVoucherOrder)
          .sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
      );
    } catch (error) {
      console.error("Failed to fetch voucher orders for cart tab", error);
      setVoucherOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.clientId]);

  const purchasedVouchers = useMemo(() => {
    if (!voucherOrders.length) return [];

    return [...voucherOrders]
      .filter((order) => String(order.status || "").toUpperCase() === "PAID")
      .sort((a, b) => {
        const aTime = new Date(a.created_at || a.createdAt || 0).getTime();
        const bTime = new Date(b.created_at || b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .flatMap((order) =>
        (order.items || []).flatMap((item: any, itemIndex: number) =>
          (item.coupons || []).flatMap((coupon: any, couponIndex: number) =>
            (coupon.vd_raw_response?.brand_details || []).flatMap(
              (brandDetail: any, brandIndex: number) =>
                (brandDetail.items || []).map((voucher: any, voucherIndex: number) => ({
                  itemId: `${order.order_number || order.order_id}-${itemIndex}-${couponIndex}-${brandIndex}-${voucherIndex}`,
                  orderNumber: order.order_number || order.order_id || "N/A",
                  brandName:
                    item?.meta?.brand_name ||
                    brandDetail.product_name ||
                    item?.brandName ||
                    "Voucher",
                  image: getOrderItemImage(item),
                  unitValue:
                    voucher?.balanceTotal ||
                    item?.unitValue ||
                    item?.unit_value ||
                    order.total_amount ||
                    "",
                  cardNumber: voucher?.getCardNo || "",
                  expiryDate: voucher?.getExpiryDate || "",
                  purchasedAt: order.created_at || order.createdAt || "",
                }))
            )
          )
        )
      );
  }, [voucherOrders]);

  useEffect(() => {
    if (activeTab !== "voucher") return;
    fetchVoucherOrders();
  }, [activeTab, fetchVoucherOrders]);

  useEffect(() => {
    if (previousCouponType.current !== couponType) {
      setEmployeeIdInput("");
      setCorporateIdInput("");
      previousCouponType.current = couponType;
    }
  }, [couponType]);

  const isApplyDisabled =
    !couponCode.trim() ||
    validateCouponMutation.isPending ||
    (isEmployeeCoupon && !employeeIdInput.trim()) ||
    (isCorporateCoupon && !corporateIdInput.trim());

  const buildValidateCouponPayload = (orderId: string, code: string) => {
    if (!cart?.items?.length || !user?.clientId) return null;

    const items = cart.items.map((item) => ({
      brandName: item.brandName,
      quantity: item.quantity,
      unitValue: item.unitValue,
    }));

    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitValue,
      0
    );

    return {
      couponCode: code.trim(),
      orderId,
      clientId: user.clientId,
      items,
      subtotal,
      fee: processingFee,
      employeeId:
        code.trim().toUpperCase().startsWith("EMP") ||
        code.trim().toUpperCase().startsWith("EMPID")
          ? employeeIdInput.trim()
          : null,
      corporateId:
        code.trim().toUpperCase().startsWith("CORP") ||
        code.trim().toUpperCase().startsWith("CORPID")
          ? corporateIdInput.trim()
          : null,
      context: null,
    };
  };

  const getNumericValue = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getCartCheckoutSignature = () => {
    if (!cart?.items?.length) return "";
    return cart.items
      .map((item) => `${item.itemId}:${item.quantity}:${item.unitValue}`)
      .sort()
      .join("|");
  };

  useEffect(() => {
    const cartSignature = getCartCheckoutSignature();

    if (!lastCheckoutCartSignatureRef.current) {
      lastCheckoutCartSignatureRef.current = cartSignature;
      setCheckoutState((prev) => ({ ...prev, cartSignature }));
      return;
    }

    if (lastCheckoutCartSignatureRef.current === cartSignature) return;

    lastCheckoutCartSignatureRef.current = cartSignature;
    setCheckoutState((prev) => ({
      ...prev,
      orderId: null,
      orderNumber: null,
      reservationId: null,
      couponApplied: false,
      couponError: null,
      discount: 0,
      finalAmount: null,
      cartSignature,
      couponCode: couponCode.trim(),
    }));
    setAppliedCoupon(null);
  }, [cart, couponCode]);

  const getErrorMessage = (error: unknown, fallbackMessage: string) => {
    if (error && typeof error === "object") {
      if (
        "response" in error &&
        error.response &&
        typeof error.response === "object"
      ) {
        if (
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data &&
          typeof error.response.data.message === "string"
        ) {
          return error.response.data.message;
        }

        if (
          "data" in error.response &&
          typeof error.response.data === "string"
        ) {
          return error.response.data;
        }
      }

      if ("message" in error && typeof error.message === "string") {
        return error.message;
      }
    }

    return fallbackMessage;
  };

  const ensureOrder = async () => {
    const cartSignature = getCartCheckoutSignature();

    if (
      checkoutState.orderId &&
      checkoutState.orderNumber &&
      checkoutState.cartSignature === cartSignature
    ) {
      console.log("[ensureOrder] Reusing existing order", {
        orderId: checkoutState.orderId,
        orderNumber: checkoutState.orderNumber,
        cartSignature,
      });
      return {
        orderId: checkoutState.orderId,
        orderNumber: checkoutState.orderNumber,
      };
    }

    const orderRequest = generateOrderRequest();
    if (!orderRequest) {
      throw new Error("Unable to create order. Please try again.");
    }

    const paymentBreakdown = buildPaymentBreakdown(useWalletBalance);
    orderRequest.order.walletUsed = useWalletBalance;
    orderRequest.order.walletAmount = paymentBreakdown.walletDeduction;
    orderRequest.order.earnCashback = earnCashback;

    console.log("[ensureOrder] Creating order request", {
      orderNumber: orderRequest.order.orderNumber,
      totalAmount: orderRequest.order.totalAmount,
      itemCount: orderRequest.items.length,
      cartSignature,
    });

    const orderResponse = await createOrderMutation.mutateAsync(orderRequest);

    console.log("[ensureOrder] Create order response", {
      orderId: orderResponse.orderId,
      orderNumber: orderResponse.orderNumber,
      status: orderResponse.status,
      message: orderResponse.message,
    });

    setCheckoutState((prev) => ({
      ...prev,
      orderId: orderResponse.orderId,
      orderNumber: orderResponse.orderNumber,
      reservationId: null,
      couponApplied: false,
      couponError: null,
      discount: 0,
      finalAmount: null,
      cartSignature,
    }));

    return {
      orderId: orderResponse.orderId,
      orderNumber: orderResponse.orderNumber,
    };
  };

  const validateAndReserveCoupon = async (
    orderContext: { orderId: string; orderNumber: string },
    source: "apply" | "pay"
  ) => {
    const activeCouponCode = couponCode.trim().toUpperCase();

    setCheckoutState((prev) => ({
      ...prev,
      couponError: null,
    }));

    // If no coupon code and paying, skip validation and return early
    if (!activeCouponCode && source === "pay") {
      console.log("[coupon:pay] No coupon code provided, skipping validation");
      setAppliedCoupon(null);
      setCheckoutState((prev) => ({
        ...prev,
        couponCode: "",
        couponApplied: false,
        couponError: null,
        reservationId: null,
        discount: 0,
        finalAmount: null,
      }));
      return { httpStatus: 200, message: "No coupon applied" };
    }

    const requestPayload = buildValidateCouponPayload(
      orderContext.orderId,
      activeCouponCode
    );

    if (!requestPayload) {
      throw new Error("Unable to validate coupon for current cart.");
    }

    console.log(`[coupon:${source}] validate request`, requestPayload);

    try {
      const data = await validateCouponMutation.mutateAsync(requestPayload);
      const status = data.httpStatus ?? 200;
      const message = data.message || data.httpMessage || "OK";

      console.log(`[coupon:${source}] validate response`, {
        status,
        message,
        data,
      });

      if (!activeCouponCode) {
        setAppliedCoupon(null);
        setCheckoutState((prev) => ({
          ...prev,
          couponCode: "",
          couponApplied: false,
          couponError: null,
          reservationId: null,
          discount: 0,
          finalAmount: null,
        }));
        return data;
      }

      const reservationId: string = (data as any).reservation_id || "";

      const discountValue =
        typeof (data as any).discount === "string"
          ? getNumericValue((data as any).discount)
          : getNumericValue((data as any).discount?.value);
      const couponFinalAmount = getNumericValue((data as any).final_amount);
      const resolvedFinalAmount =
        couponFinalAmount > 0
          ? couponFinalAmount
          : Math.max(0, requestPayload.subtotal + requestPayload.fee - discountValue);

      setAppliedCoupon({
        code: activeCouponCode,
        coupon_id: String((data as any).coupon_id || ""),
        reservationId: reservationId || "",
        discountAmount: discountValue,
        finalAmount: resolvedFinalAmount,
      });

      setCheckoutState((prev) => ({
        ...prev,
        couponCode: activeCouponCode,
        couponApplied: true,
        couponError: null,
        reservationId,
        discount: discountValue,
        finalAmount: resolvedFinalAmount,
      }));

      if (reservationId) {
        saveReservationIdForOrder(orderContext.orderNumber, reservationId);
      }

      if (source === "apply") {
        toast({
          title: "Coupon applied",
          description: String((data as any).message || "Coupon applied successfully."),
        });
      }

      return data;
    } catch (error) {
      if (error instanceof CouponValidationError) {
        console.error(`[coupon:${source}] validate failed`, {
          status: error.status,
          message: error.message,
          data: error.data,
        });
      } else {
        console.error(`[coupon:${source}] validate failed`, error);
      }

      setCheckoutState((prev) => ({
        ...prev,
        couponApplied: false,
        couponError: getErrorMessage(error, "Coupon validation failed."),
        reservationId: null,
        discount: 0,
        finalAmount: null,
      }));
      setAppliedCoupon(null);
      throw error;
    }
  };

  const saveReservationIdForOrder = (orderNumber: string, reservationId: string) => {
    try {
      const raw = sessionStorage.getItem(COUPON_RESERVATION_MAP_KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      current[orderNumber] = reservationId;
      sessionStorage.setItem(COUPON_RESERVATION_MAP_KEY, JSON.stringify(current));
    } catch (error) {
      console.warn("Failed to persist coupon reservation mapping", error);
    }
  };

  const saveSuperCoinHoldForOrder = (
    orderNumber: string,
    holdContext: SuperCoinHoldContext
  ) => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, SuperCoinHoldContext>) : {};
      current[orderNumber] = holdContext;
      sessionStorage.setItem(SUPERCOIN_HOLD_MAP_KEY, JSON.stringify(current));
    } catch (error) {
      console.warn("Failed to persist SuperCoin hold mapping", error);
    }
  };

  const getSuperCoinHoldForOrder = (orderNumber: string): SuperCoinHoldContext | null => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return null;
      const current = JSON.parse(raw) as Record<string, SuperCoinHoldContext>;
      return current[orderNumber] || null;
    } catch (error) {
      console.warn("Failed to read SuperCoin hold mapping", error);
      return null;
    }
  };

  const clearSuperCoinHoldForOrder = (orderNumber: string) => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_HOLD_MAP_KEY);
      if (!raw) return;
      const current = JSON.parse(raw) as Record<string, SuperCoinHoldContext>;
      delete current[orderNumber];
      sessionStorage.setItem(SUPERCOIN_HOLD_MAP_KEY, JSON.stringify(current));
    } catch (error) {
      console.warn("Failed to clear SuperCoin hold mapping", error);
    }
  };

  const saveActiveSuperCoinHold = (holdContext: SuperCoinHoldContext) => {
    try {
      sessionStorage.setItem(SUPERCOIN_ACTIVE_HOLD_KEY, JSON.stringify(holdContext));
    } catch {}
  };

  const loadActiveSuperCoinHold = (): SuperCoinHoldContext | null => {
    try {
      const raw = sessionStorage.getItem(SUPERCOIN_ACTIVE_HOLD_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SuperCoinHoldContext;
    } catch {
      return null;
    }
  };

  const clearActiveSuperCoinHold = () => {
    try {
      sessionStorage.removeItem(SUPERCOIN_ACTIVE_HOLD_KEY);
    } catch {}
  };

  useEffect(() => {
    const holdData = loadActiveSuperCoinHold();
    if (!holdData) return;

    const expiryMs =
      holdData.stampExpiry ??
      (holdData.transactionTime
        ? new Date(holdData.transactionTime).getTime() + 15 * 60 * 1000
        : 0);

    if (expiryMs <= 0 || Date.now() >= expiryMs) {
      clearActiveSuperCoinHold();
      return;
    }

    superCoinHoldContextRef.current = holdData;
    setSuperCoinHoldContext(holdData);
    setSuperCoinAuthorized(true);
    setSuperCoinHoldExpiryMs(expiryMs);
    setTransactionTime(holdData.transactionTime ?? null);
    setRewardMode("superCoins");
  }, []);

  // Apply coupon function
  const applyCoupon = async () => {
    if (!cart?.items || cart.items.length === 0) return;

    setCheckoutState((prev) => ({
      ...prev,
      couponError: null,
    }));

    if (!couponCode.trim()) {
      toast({
        title: "Enter coupon",
        description: "Please enter a coupon code.",
      });
      return;
    }

    if (isEmployeeCoupon && !employeeIdInput.trim()) {
      toast({
        title: "Employee ID Required",
        description: "Please enter Employee ID for employee coupon.",
        variant: "destructive",
      });
      return;
    }

    if (isCorporateCoupon && !corporateIdInput.trim()) {
      toast({
        title: "Corporate ID Required",
        description: "Please enter Corporate ID for corporate coupon.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const orderContext = await ensureOrder();
      setCheckoutState((prev) => ({
        ...prev,
        couponCode: couponCode.trim().toUpperCase(),
      }));

      await validateAndReserveCoupon(orderContext, "apply");
    } catch (error) {
      const errorMessage = getErrorMessage(
        error,
        "Failed to validate coupon code."
      );
      toast({
        title: "Coupon Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Remove applied coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCheckoutState((prev) => ({
      ...prev,
      couponCode: "",
      couponApplied: false,
      couponError: null,
      reservationId: null,
      discount: 0,
      finalAmount: null,
    }));
    setCouponCode("");
    setEmployeeIdInput("");
    setCorporateIdInput("");
    toast({
      title: "Coupon Removed",
      description: "Coupon discount has been removed from your cart.",
    });
  };

  const cartItems = cart?.items ?? [];
  const cartItemCount = cartItems.length;

  const [brandDiscountMap, setBrandDiscountMap] = useState<Record<string, number>>({});
  const fetchedBrandIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (cartItems.length === 0) return;
    const uniqueBrandIds = [...new Set(cartItems.map((i) => i.brandId))];
    const unknownBrandIds = uniqueBrandIds.filter((id) => !fetchedBrandIdsRef.current.has(id));
    if (unknownBrandIds.length === 0) return;

    unknownBrandIds.forEach((id) => fetchedBrandIdsRef.current.add(id));
    let cancelled = false;
    Promise.all(
      unknownBrandIds.map((brandId) =>
        brandApi
          .post<{ discount?: string | number } | null>(`/brands/${brandId}`, {})
          .then((r) => ({ brandId, discount: Number(r?.data?.discount) || 0 }))
          .catch(() => ({ brandId, discount: 0 }))
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
    });
    return () => {
      cancelled = true;
    };
  }, [cartItems.map((i) => i.brandId).join(",")]);

  const handleQuantityUpdate = (itemId: string, newQuantity: number) => {
    if (updatingItemId === itemId) return;
    setUpdatingItemId(itemId);
    updateQuantity(itemId, newQuantity);
    setTimeout(() => setUpdatingItemId(null), 650);
  };

  const handleRemoveClick = (itemId: string, brandName: string) => {
    setItemToDelete({ itemId, brandName });
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      removeFromCart(itemToDelete.itemId);
      toast({
        title: "Item Removed",
        description: `${itemToDelete.brandName} has been removed from your cart`,
      });
      setItemToDelete(null);
    }
  };

  const cancelDelete = () => {
    setItemToDelete(null);
  };

  // Calculate brand totals
  const brandTotals = cartItems.reduce((acc, item) => {
    const key = `${item.brandId}-${item.unitValue}`;
    const discount = item.discount ?? brandDiscountMap[item.brandId] ?? 0;
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

  const walletBalance = walletData?.totalBalance || 0;
  const subtotal = cart?.totalAmount ?? 0;
  const processingFee = 0;

  // SuperCoin exclusion: check if all items are from excluded brands
  const allItemsSuperCoinExcluded = cartItems.length > 0 && cartItems.every(item => isSuperCoinExcluded(item.brandName));
  const superCoinEligibleTotal = cartItems
    .filter(item => !isSuperCoinExcluded(item.brandName))
    .reduce((sum, item) => sum + item.lineTotal, 0);

  const maxWalletUsage = subtotal * 0.5;

  const walletDeduction = useWalletBalance
    ? Math.min(walletBalance, maxWalletUsage)
    : 0;
  
  // Calculate coupon discount based on type
  const couponDiscount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const couponAdjustedAmount = Math.max(
    0,
    subtotal + processingFee - couponDiscount
  );

  const discountsLoaded = cartItems.every(
    (item) => item.discount !== undefined || brandDiscountMap[item.brandId] !== undefined
  );

  const maxSuperCoinRedeemable = discountsLoaded
    ? Math.max(
        ...cartItems
          .filter(item => !isSuperCoinExcluded(item.brandName))
          .map(item => item.discount ?? brandDiscountMap[item.brandId] ?? 0),
        0
      )
    : superCoinState.balance;

  const superCoinDeduction = !allItemsSuperCoinExcluded && superCoinAuthorized && superCoinState.eligible
    ? Math.min(
        superCoinHoldContext?.amount ?? superCoinState.balance,
        maxSuperCoinRedeemable
      )
    : 0;

  // Final amount after coupon-adjusted amount, wallet deduction, and SuperCoin deduction
  const finalPayable = Math.max(
    0,
    couponAdjustedAmount - walletDeduction - superCoinDeduction
  );
  const uiTotalToPay = Number(finalPayable.toFixed(2));
  const estimatedEarn = finalPayable * 0.01;

  // Cashback percentage from brand discounts (weighted average across cart items)
  const cashbackPercent = useMemo(() => {
    if (!cartItems.length) return 0;
    const totalLine = cartItems.reduce((s, i) => s + i.lineTotal, 0);
    if (totalLine <= 0) return 0;
    return cartItems.reduce((sum, item) => {
      const disc = item.discount ?? brandDiscountMap[item.brandId] ?? 0;
      return sum + (item.lineTotal / totalLine) * disc;
    }, 0);
  }, [cartItems, brandDiscountMap]);
  const cashbackAmount = finalPayable * (cashbackPercent / 100);

  const buildPaymentBreakdown = (
    walletEnabled: boolean,
    coupon = appliedCoupon,
    superCoinEnabled = superCoinAuthorized
  ) => {
    const currentWalletDeduction = walletEnabled
      ? Math.min(walletBalance, maxWalletUsage)
      : 0;
    const currentCouponDiscount = coupon ? coupon.discountAmount : 0;
    const currentCouponApiFinalAmount = coupon?.finalAmount ?? null;
    const currentCouponAdjustedAmount = Math.max(
      0,
      subtotal + processingFee - currentCouponDiscount
    );
    const currentSuperCoinDeduction =
      !allItemsSuperCoinExcluded && superCoinEnabled && superCoinState.eligible
        ? Math.min(
            superCoinHoldContext?.amount ?? superCoinState.balance,
            maxSuperCoinRedeemable
          )
        : 0;
    const currentFinalPayable = Math.max(
      0,
      currentCouponAdjustedAmount - currentWalletDeduction - currentSuperCoinDeduction
    );

    return {
      subtotal,
      walletDeduction: currentWalletDeduction,
      couponDiscount: currentCouponDiscount,
      superCoinDeduction: currentSuperCoinDeduction,
      processingFee,
      couponApiFinalAmount: currentCouponApiFinalAmount,
      couponAdjustedAmount: currentCouponAdjustedAmount,
      finalPayable: currentFinalPayable,
    };
  };

  const persistSuperCoinHoldForPayment = (
    orderNumber: string,
    superCoinAmount: number
  ) => {
    if (!superCoinAuthorized || superCoinAmount <= 0) return;

    const holdContext = superCoinHoldContextRef.current || superCoinHoldContext;
    if (!holdContext) return;

    saveSuperCoinHoldForOrder(orderNumber, holdContext);
  };

  const cancelSuperCoinHoldIfNeeded = async (orderNumber?: string) => {
    superCoinHoldContextRef.current = null;
    setSuperCoinHoldContext(null);
    setSuperCoinHoldExpiryMs(null);
    clearActiveSuperCoinHold();
    if (orderNumber) {
      clearSuperCoinHoldForOrder(orderNumber);
    }
  };

  const unholdSuperCoin = async (orderNumber?: string) => {
    const activeHoldContext =
      superCoinHoldContextRef.current ||
      superCoinHoldContext ||
      (orderNumber ? getSuperCoinHoldForOrder(orderNumber) : null) ||
      (superCoinOrderNumber ? getSuperCoinHoldForOrder(superCoinOrderNumber) : null);
    if (!activeHoldContext || !superCoinIdentity) return;

    try {
      await cancelSuperCoinHold({
        identity: superCoinIdentity,
        merchantTransactionId: activeHoldContext.merchantTransactionId,
        merchantWalletId: activeHoldContext.merchantWalletId,
      });
    } catch (error) {
      console.warn("Failed to cancel SuperCoin hold", error);
    } finally {
      superCoinHoldContextRef.current = null;
      setSuperCoinHoldContext(null);
      setSuperCoinHoldExpiryMs(null);
      clearActiveSuperCoinHold();
      clearSuperCoinHoldForOrder(orderNumber || superCoinOrderNumber || "");
    }
  };

  const requestSwitchToCashback = useCallback(() => {
    if (superCoinAuthorized) {
      setShowSuperCoinRemoveDialog(true);
      return;
    }

    setRewardMode("cashbackWallet");
  }, [superCoinAuthorized]);

  const openSuperCoinFlow = useCallback(async () => {
    if (!superCoinIdentity) return;

    try {
      const orderContext = await ensureOrder();
      setSuperCoinOrderNumber(orderContext.orderNumber);
      setSuperCoinOTPModalOpen(true);
    } catch (error) {
      console.error("Failed to create order before SuperCoin hold", error);
      toast({
        title: "Unable to start SuperCoins",
        description: "Please try again after the order is created.",
        variant: "destructive",
      });
    }
  }, [ensureOrder, superCoinIdentity, toast]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!superCoinIdentity || paymentInFlightRef.current) return;
      const holdContext =
        superCoinHoldContextRef.current || superCoinHoldContext || loadActiveSuperCoinHold();
      if (!holdContext) return;
      const payload = JSON.stringify({
        identity: superCoinIdentity,
        merchantTransactionId: holdContext.merchantTransactionId,
        merchantWalletId: holdContext.merchantWalletId,
      });
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_BASE_URL || ""}/v1/supercoin/unhold`,
        new Blob([payload], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [superCoinIdentity]);

  // Step 1: Create Order in Database
  const handlePayNow = async (gateway: "ntt" | "easebuzz") => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to place an order",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }

    if (!user?.clientId) {
      toast({
        title: "Error",
        description: "User client ID not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaymentSheetOpen(true);
      const paymentBreakdown = buildPaymentBreakdown(useWalletBalance);
      const orderContext = await ensureOrder();

      const validateResult = await validateAndReserveCoupon(orderContext, "pay");
      console.log("[pay] validate status/message", {
        status: validateResult.httpStatus ?? 200,
        message: validateResult.message || validateResult.httpMessage || "OK",
      });

      await persistSuperCoinHoldForPayment(
        orderContext.orderNumber,
        paymentBreakdown.superCoinDeduction
      );

      validateOrder(orderContext.orderNumber, gateway, paymentBreakdown);
    } catch (error) {
      await cancelSuperCoinHoldIfNeeded();
      const errorMessage = getErrorMessage(
        error,
        "Failed to continue checkout. Please try again."
      );
      console.error("[pay] checkout stopped", {
        message: errorMessage,
      });
      toast({
        title: "Checkout Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setPaymentSheetOpen(false);
    }
  };

  const validateOrder = (
    orderNumber: string,
    gateway: "ntt" | "easebuzz",
    paymentBreakdown: ReturnType<typeof buildPaymentBreakdown>
  ) => {
    console.log("ðŸ” Validating order:", orderNumber);
    console.log("Payment breakdown", paymentBreakdown);

    validateOrderMutation.mutate(
      {
        orderNumber: orderNumber,
        cartTotal: paymentBreakdown.subtotal,
        walletAmount: paymentBreakdown.walletDeduction,
        walletUsed: useWalletBalance,
      },
      {
        onSuccess: (validationResponse) => {
          console.log("âœ… Validation response:", validationResponse);

          if (!validationResponse.valid) {
            void cancelSuperCoinHoldIfNeeded(orderNumber);
            setPaymentSheetOpen(false);
            toast({
              title: "Validation Failed",
              description: validationResponse.message,
              variant: "destructive",
            });
            return;
          }

          console.log(
            "ðŸ’³ Payment required. Amount:",
            validationResponse.amountToPay
          );
          // Proceed to payment without storing snapshot
          // Post-payment pages fetch fresh data from backend
          const uiTotalToPay = Number(paymentBreakdown.finalPayable.toFixed(2));
          generatePaymentToken(uiTotalToPay, orderNumber, gateway, paymentBreakdown);
        },
        onError: (error) => {
          void cancelSuperCoinHoldIfNeeded(orderNumber);
          setPaymentSheetOpen(false);
          console.error("âŒ Validation error:", error);
          toast({
            title: "Validation Failed",
            description:
              error.message || "Failed to validate order. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const generatePaymentToken = (
    amount: number,
    orderNumber: string,
    gateway: "ntt" | "easebuzz",
    paymentBreakdown: ReturnType<typeof buildPaymentBreakdown>
  ) => {
    console.log("Generating payment token for order:", orderNumber);
    console.log("Payment breakdown", paymentBreakdown);
    console.log("Gateway amount passed:", amount);
    console.log("UI total to pay used for payment:", uiTotalToPay);

    const amountToCharge = amount;

    generateTokenMutation.mutate(orderNumber, {
      onSuccess: (tokenResponse) => {
        console.log("Payment token generated successfully:", tokenResponse);

        // Extract the actual token string
        const token = tokenResponse.sabbpe_token;
        
        if (!token) {
          void cancelSuperCoinHoldIfNeeded(orderNumber);
          setPaymentSheetOpen(false);
          console.error("No token in response:", tokenResponse);
          toast({
            title: "Token generation failed",
            description: "No token received from server",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Token Generated",
          description: `Redirecting to ${
            gateway === "easebuzz" ? "Easebuzz" : "NTT Data"
          }...`,
        });

        // Route to appropriate gateway
        if (gateway === "easebuzz") {
          initiateEasebuzzPayment(amountToCharge, orderNumber, token, paymentBreakdown);
        } else {
          initiatePayment(amountToCharge, orderNumber, token);
        }
      },
      onError: (error) => {
        void cancelSuperCoinHoldIfNeeded(orderNumber);
        setPaymentSheetOpen(false);
        console.error("Token generation error:", error);
        toast({
          title: "Token generation failed",
          description: "Failed to generate payment token. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  // Step 2: Initiate Payment
  const initiatePayment = async (
    amount: number,
    orderNumber: string,
    token: string
  ) => {
    console.log("Initiating payment with token:", token);

    // Check if script is loaded
    if (scriptStatus !== "ready") {
      void cancelSuperCoinHoldIfNeeded(orderNumber);
      setPaymentSheetOpen(false);
      toast({
        title: "Payment system loading",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if AtomPaynetz is available
    if (typeof window.AtomPaynetz !== "function") {
      void cancelSuperCoinHoldIfNeeded(orderNumber);
      setPaymentSheetOpen(false);
      console.error("AtomPaynetz not available:", window.AtomPaynetz);
      toast({
        title: "Payment system error",
        description:
          "Payment gateway not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.clientId) {
      void cancelSuperCoinHoldIfNeeded(orderNumber);
      setPaymentSheetOpen(false);
      toast({
        title: "Error",
        description: "User information missing. Please login again.",
        variant: "destructive",
      });
      return;
    }

    const dataToEncrypt = `${orderNumber}|${user.clientId}`;

    const encryptedData = await encrypt(dataToEncrypt);

    // Call the payment process API
    paymentMutation.mutate(
      { amount, orderNumber: orderNumber, encryptedData: encryptedData, token },
      {
        onSuccess: (data) => {
          console.log("Payment process response:", data);

          if (data.responseDetails?.txnStatusCode !== "OTS0000") {
            void cancelSuperCoinHoldIfNeeded(orderNumber);
            setPaymentSheetOpen(false);
            toast({
              title: "Payment initiation failed",
              description:
                data.responseDetails?.txnDescription || "Please try again",
              variant: "destructive",
            });
            return;
          }

          const options = {
            atomTokenId: data.atomTokenId,
            merchId: import.meta.env.VITE_PAYMENT_TRANSACTION_MERCHANTID,
            custEmail: "contact@gift360.io",
            custMobile: "9876543210",
            returnUrl: import.meta.env.VITE_PAYMENT_RETURN_BACKEND_URL,
  };

          console.log("Opening payment gateway:", options);

          try {
            paymentInFlightRef.current = true;
            new window.AtomPaynetz(options, import.meta.env.VITE_PAYMENT_ENV);
            clearCart();
          } catch (error) {
            void cancelSuperCoinHoldIfNeeded(orderNumber);
            setPaymentSheetOpen(false);
            console.error("Payment gateway error:", error);
            toast({
              title: "Payment error",
              description: "Failed to open payment gateway. Please try again.",
              variant: "destructive",
            });
          }
        },
        onError: (error) => {
          void cancelSuperCoinHoldIfNeeded(orderNumber);
          setPaymentSheetOpen(false);
          console.error("Payment process error:", error);
          toast({
            title: "Payment failed",
            description: "Failed to initiate payment. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const initiateEasebuzzPayment = async (
    amount: number,
    orderNumber: string,
    token: string,
    paymentBreakdown: ReturnType<typeof buildPaymentBreakdown>
  ) => {
    console.log("ðŸ’³ Initiating Easebuzz payment");

    if (easebuzzScriptStatus !== "ready") {
      void cancelSuperCoinHoldIfNeeded(orderNumber);
      setPaymentSheetOpen(false);
      toast({
        title: "Payment system loading",
        description: "Please wait a moment and try again.",
        variant: "destructive",
      });
      return;
    }

    // Use SabbPe initiate format.
    // Send encrypted_order_ref so callback txnid maps to the actual order number.
    if (!user?.clientId) {
      void cancelSuperCoinHoldIfNeeded(orderNumber);
      setPaymentSheetOpen(false);
      toast({
        title: "Error",
        description: "User information missing. Please login again.",
        variant: "destructive",
      });
      return;
    }
    const encryptedOrderRef = await encrypt(`${orderNumber}|${user.clientId}`);
    const sabbpeFrontendUrl = import.meta.env.VITE_SABBPE_FRONTEND_URL || window.location.hostname;

    const paymentRequest = {
      sabbpe_token: token,
      amount,
      productinfo: import.meta.env.VITE_SABBPE_PRODUCT_INFO || "Gift Voucher Purchase",
      frontend_url: sabbpeFrontendUrl,
      encrypted_order_ref: encryptedOrderRef,
      client_id: user.clientId, // âœ… Explicitly pass client_id for udf2
      customer: {
        firstname: import.meta.env.VITE_PAYMENT_CUSTFIRSTNAME || user?.name || "Test",
        email: import.meta.env.VITE_PAYMENT_CUSTEMAIL || user?.email || "contact@sabbpe.com",
        phone: import.meta.env.VITE_PAYMENT_CUSTMOBILE || user?.mobile || "9876543210",
      },
    };

    console.log("Payment breakdown", paymentBreakdown);
    console.log("Gateway amount passed:", amount);
    console.log("UI total to pay used in request:", uiTotalToPay);
    console.log("ðŸ“¤ Easebuzz payment request:", paymentRequest);

    easebuzzPaymentMutation.mutate(paymentRequest, {
      onSuccess: (response) => {
        console.log("âœ… Easebuzz response:", response);

        const isSuccess =
          response.status === 1 || response.status === true;

        if (!isSuccess) {
          void cancelSuperCoinHoldIfNeeded(orderNumber);
          setPaymentSheetOpen(false);
          toast({
            title: "Payment initiation failed",
            description:
              response.message ||
              "Unable to initiate payment. Please try again.",
            variant: "destructive",
          });
          return;
        }

        // Sabbpe returns payment_url (with underscore)
        const paymentUrl = response.payment_url || (response as { paymentUrl?: string }).paymentUrl || response.data;

        if (!paymentUrl) {
          void cancelSuperCoinHoldIfNeeded(orderNumber);
          setPaymentSheetOpen(false);
          console.error("âŒ No payment URL in response:", response);
          toast({
            title: "Payment error",
            description: "Invalid payment response. Please try again.",
            variant: "destructive",
          });
          return;
        }

        console.log("ðŸ”‘ Redirecting to payment URL:", paymentUrl);

        paymentInFlightRef.current = true;
        window.location.href = paymentUrl;
        clearCart();
      },
      onError: (error) => {
        void cancelSuperCoinHoldIfNeeded(orderNumber);
        setPaymentSheetOpen(false);
        console.error("âŒ Easebuzz error:", error);
        toast({
          title: "Payment failed",
          description: "Failed to initiate Easebuzz payment. Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const isProcessing =
    createOrderMutation.isPending ||
    validateCouponMutation.isPending ||
    validateOrderMutation.isPending ||
    generateTokenMutation.isPending ||
    paymentMutation.isPending ||
    easebuzzPaymentMutation.isPending;

  useEffect(() => {
    const search = location.includes("?") ? location.split("?")[1] : "";
    const autoPay = new URLSearchParams(search).get("autopay");

    if (autoPay !== "easebuzz") return;
    if (autoPayTriggeredRef.current) return;
    if (cartLoading || isProcessing) return;
    if (easebuzzScriptStatus !== "ready") return;
    if (!cart || cart.items.length === 0) return;

    autoPayTriggeredRef.current = true;
    handlePayNow("easebuzz");
    setLocation("/cart");
  }, [
    location,
    cart,
    cartLoading,
    isProcessing,
    easebuzzScriptStatus,
    setLocation,
  ]);

  useEffect(() => {
    const search = location.includes("?") ? location.split("?")[1] : "";
    const tab = new URLSearchParams(search).get("tab");
    if (tab === "cart" || tab === "voucher") {
      setActiveTab(tab);
    }
  }, [location]);

  const handleTabChange = (tab: "cart" | "voucher") => {
    setActiveTab(tab);
    setLocation(`/cart?tab=${tab}`);
  };

  const handleProceedFromItem = (item: { brandId: string; quantity: number; unitValue: number }) => {
    setSheetBrandId(item.brandId);
    setSheetAmount(item.unitValue);
    setSheetQuantity(item.quantity);
    setSheetOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="relative flex-1 flex items-center justify-center pb-20 md:pb-0 overflow-hidden">
          <div className="absolute inset-0 bg-hero-aurora">
            <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
          </div>
          <div className="relative z-10 text-center space-y-5 p-6 max-w-md w-full">
            <div className="relative inline-block">
              <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
              <div className="relative w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center g-float mx-auto">
                <ShoppingBag className="h-9 w-9 text-amber-300" />
                      </div>
                    </div>
            <div>
              <h1 className="text-3xl font-extrabold mb-1">
                <span className="text-gold-gradient">Please Login</span>
              </h1>
              <p className="text-sm text-white/70 font-medium">
                You need to be logged in to view your cart
              </p>
            </div>
            {guestCartCount > 0 && (
              <div className="rounded-2xl bg-blackcard card-edge p-4 text-left">
                <p className="text-sm text-white/80 mb-1">
                  You have <strong className="text-amber-200">{guestCartCount} item(s)</strong> in your cart
                </p>
                <p className="text-xs text-white/60">
                  Login to sync your cart and proceed to checkout
                </p>
              </div>
            )}
            <Link href="/login">
              <button className="h-12 px-8 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all mt-2">
                Login to Continue
              </button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="relative flex-1 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-hero-aurora">
            <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
          </div>
          <div className="relative z-10 animate-spin rounded-full h-12 w-12 border-b-2 border-amber-300" />
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  if (cartError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="relative flex-1 flex items-center justify-center px-4 overflow-hidden">
          <div className="absolute inset-0 bg-hero-aurora">
            <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
          </div>
          <div className="relative z-10 text-center space-y-4">
            <h1 className="text-2xl font-extrabold"><span className="text-gold-gradient">Error Loading Cart</span></h1>
            <p className="text-white/70">Please try again</p>
            <Link href="/brands">
              <button className="h-11 px-6 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">Back to Shopping</button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  // Show the hard empty-cart state only for the cart tab.
  if (activeTab === "cart" && (!cart || !cart.items || cart.items.length === 0)) {
    return (
    <div className="cart-color-system cart-page min-h-screen flex flex-col">
        <Header />
        <main className="relative flex-1 flex items-center justify-center pb-20 md:pb-0 px-4">
          <div className="empty-cart text-center">
            <h3 className="empty-text">Your cart is empty</h3>
            <p>Add vouchers to get started</p>
            <Link href="/brands">
              <button className="h-11 px-6 rounded-2xl cart-gradient-fill font-bold shadow-lg shadow-[rgba(151,71,255,0.25)] hover:brightness-110 active:scale-95 transition-all mt-4">
                Start Shopping
              </button>
            </Link>
          </div>
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="cart-color-system cart-page min-h-screen flex flex-col">
      <Header />

      <main className="relative flex-1 overflow-hidden">
        {/* Aurora backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(179.64deg, #9747FF -354.99%, #FFFFFF 99.68%)" }}
        >
          <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl anim-aurora"
            style={{ background: "radial-gradient(circle, hsla(280,90%,60%,0.55), transparent 70%)" }} />
          <div className="absolute top-32 -right-16 w-80 h-80 rounded-full blur-3xl anim-aurora"
            style={{ background: "radial-gradient(circle, hsla(220,90%,55%,0.5), transparent 70%)", animationDelay: "3s" }} />
          <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        </div>

        <div className="relative z-10 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pt-8 sm:pb-10">
            <h1 className="cart-title text-3xl sm:text-4xl font-extrabold mb-2 sm:mb-3 cart-text-primary">
              Shopping Cart
            </h1>
            <p className="text-sm sm:text-base font-medium cart-text-secondary">
              {cartItemCount} {cartItemCount === 1 ? "item" : "items"} in your cart
            </p>
          </div>
        </div>

        <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-24 md:pb-10">
          <CartTabs activeTab={activeTab} onTabChange={handleTabChange} />

          {activeTab === "cart" ? (
          <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
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

                        <button
                          className="h-9 w-9 rounded-xl flex items-center justify-center cart-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          onClick={() => handleRemoveClick(item.itemId, item.brandName)}
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            className="h-8 w-8 rounded-lg border border-[var(--cart-secondary)] bg-[rgba(162,155,254,0.12)] cart-text-primary flex items-center justify-center hover:bg-[rgba(162,155,254,0.2)] disabled:opacity-40 transition-all"
                            onClick={() => handleQuantityUpdate(item.itemId, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updatingItemId === item.itemId}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>

                          <span className="w-7 text-center font-bold text-sm sm:text-base cart-text-primary">
                            {item.quantity}
                          </span>

                          <button
                            className="h-8 w-8 rounded-lg border border-[var(--cart-secondary)] bg-[rgba(162,155,254,0.12)] cart-text-primary flex items-center justify-center hover:bg-[rgba(162,155,254,0.2)] disabled:opacity-40 transition-all"
                            onClick={() => handleQuantityUpdate(item.itemId, item.quantity + 1)}
                            disabled={updatingItemId === item.itemId}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
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
                      <div key={key} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm cart-text-secondary">
                            {data.brand}
                            {data.discount > 0 && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                                {data.discount}% Cashback
                              </span>
                            )}
                          </span>
                          <span className="font-medium text-xs sm:text-sm cart-text-primary">
                            {data.quantity} × ₹{data.price.toFixed(2)} = ₹
                            {data.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}

                    <Separator className="my-3 sm:my-4" />

                    {/* ── Rewards Section ── */}
                    <div className="space-y-4">
                      {/* Master Toggle */}
                      <div className="flex items-center justify-center">
                        <div className="relative flex items-center rounded-full bg-muted p-1">
                          <button
                            type="button"
                            onClick={() => {
                              requestSwitchToCashback();
                            }}
                            className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                              rewardMode === 'cashbackWallet' || allItemsSuperCoinExcluded
                                ? 'bg-[#34D399] shadow-sm text-white font-semibold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <Sparkles className="h-4 w-4" />
                            Cashback &amp; Wallet
                          </button>
                          {!allItemsSuperCoinExcluded && (
                          <button
                            type="button"
                            onClick={() => setRewardMode('superCoins')}
                            className={`relative z-10 flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${
                              rewardMode === 'superCoins'
                                ? 'bg-[#34D399] shadow-sm text-white font-semibold'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            <img src={superCoinIcon} alt="" className="h-4 w-4" />
                            SuperCoins
                          </button>
                          )}
                        </div>
                      </div>

                      {/* Two Groups Side-by-Side */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* Group A: Cashback & Wallet */}
                        {rewardMode === 'cashbackWallet' && (
                        <div className="space-y-3">
                          {/* Earn Cashback Card */}
                          <div className="p-3 sm:p-4 rounded-xl border bg-[rgba(52,211,153,0.06)] border-[rgba(52,211,153,0.25)]">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
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
                            </div>
                          </div>

                          {/* Redeem Wallet Card */}
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
                            className={`relative p-3 sm:p-4 rounded-xl border transition-all duration-200 ease-in-out outline-none ${
                              useWalletBalance
                                ? "bg-[rgba(151,71,255,0.08)] border-l-[3px] border-l-[var(--cart-primary)] border-t border-r border-b border-t-[rgba(151,71,255,0.3)] border-r-[rgba(151,71,255,0.3)] border-b-[rgba(151,71,255,0.3)]"
                                : "bg-[rgba(151,71,255,0.05)] border-[rgba(151,71,255,0.2)] cursor-pointer"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                                useWalletBalance
                                  ? "border-[var(--cart-primary)] bg-[var(--cart-primary)]"
                                  : "border-muted-foreground/40 bg-transparent"
                              }`}>
                                {useWalletBalance && <span className="h-2 w-2 rounded-full bg-white" />}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Wallet className={`h-4 w-4 ${
                                    useWalletBalance ? "text-[var(--cart-primary)]" : "text-[var(--cart-primary)]/70"
                                  }`} />
                                  <span className="text-sm sm:text-base font-medium cart-text-primary">
                                    Redeem Wallet Points
                                  </span>
                                </div>
                                <p className="text-xs sm:text-sm mt-1 text-muted-foreground">
                                  Available: ₹{walletBalance.toFixed(2)} • Max: ₹{maxWalletUsage.toFixed(2)} (50% of cart)
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

                        {/* Group B: SuperCoins */}
                        {rewardMode === 'superCoins' && !allItemsSuperCoinExcluded && (
                        <div className="space-y-3">
                          {/* SuperCoin balance info via existing card (read-only) */}
                          <SuperCoinStatusCard
                            mobile={user?.mobile}
                            enabled={superCoinAuthorized}
                            maxRedeemable={maxSuperCoinRedeemable}
                            estimatedEarn={estimatedEarn}
                            hideToggle
                            onStateChange={({ eligible, balance, enabled }) =>
                              setSuperCoinState({
                                eligible,
                                balance,
                                enabled,
                              })
                            }
                          />

                          {!superCoinAuthorized ? (
                            <Button
                              className="w-full cart-gradient-fill h-11"
                              disabled={superCoinState.balance <= 0}
                              onClick={() => {
                                void openSuperCoinFlow();
                              }}
                            >
                              Apply SuperCoins
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[rgba(151,71,255,0.08)] border border-[rgba(151,71,255,0.25)]">
                                <span className="text-sm font-medium text-[#7C3AED] flex items-center gap-1.5">
                                  SuperCoins active
                                  <img src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                                </span>
                                <button
                                  type="button"
                                  className="text-xs font-medium text-[#7C3AED] hover:text-[#6D28D9] underline"
                                  onClick={async () => {
                                    await unholdSuperCoin(superCoinOrderNumber || undefined);
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

                    {/* ── Coupon Section (hidden) ── */}
                    {false && (<>
                    {/* Coupons section header */}
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
                      Coupons
                    </p>

                    {/* Coupon Code Section */}
                    <div
                      className={`
                        p-3 sm:p-4 rounded-xl border-2 transition-all
                        bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.3)]
                      `}
                    >
                      <div className="space-y-3">
                        <label
                          className="text-sm sm:text-base font-medium flex items-center gap-2"
                        >
                          <Ticket className="h-4 w-4 text-[var(--cart-primary)]" />
                          Apply Coupon Code
                        </label>

                        {/* Show applied coupon or input */}
                        {appliedCoupon ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                  {appliedCoupon.code}
                                </span>
                                <span className="text-xs text-green-600 dark:text-green-400">
                                  (₹{appliedCoupon.discountAmount.toFixed(2)} off)
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeCoupon}
                                className="h-auto p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex gap-2">
                              <Input
                                type="text"
                                placeholder="Enter coupon code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                className="flex-[0.7] h-10 sm:h-11 text-sm sm:text-base"
                                disabled={validateCouponMutation.isPending}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && couponCode.trim()) {
                                    applyCoupon();
                                  }
                                }}
                              />
                              <Button
                                onClick={applyCoupon}
                                disabled={isApplyDisabled}
                                className="flex-[0.3] cart-gradient-fill h-10 sm:h-11 text-sm sm:text-base transition-all shadow-md hover:shadow-lg"
                              >
                                {validateCouponMutation.isPending ? "Validating..." : "Apply"}
                              </Button>
                            </div>
                            {isCorporateCoupon && (
                              <Input
                                type="text"
                                placeholder="Enter Corporate ID"
                                value={corporateIdInput}
                                onChange={(e) => setCorporateIdInput(e.target.value.toUpperCase())}
                                className="h-10 sm:h-11 text-sm sm:text-base"
                                disabled={validateCouponMutation.isPending}
                              />
                            )}
                            {isEmployeeCoupon && (
                              <Input
                                type="text"
                                placeholder="Enter Employee ID"
                                value={employeeIdInput}
                                onChange={(e) => setEmployeeIdInput(e.target.value.toUpperCase())}
                                className="h-10 sm:h-11 text-sm sm:text-base"
                                disabled={validateCouponMutation.isPending}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    </>)}
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base cart-text-secondary">
                        Subtotal
                      </span>
                      <span className="font-medium text-sm sm:text-base cart-text-primary">
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Show wallet deduction if applied */}
                    {useWalletBalance && walletDeduction > 0 && (
                      <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                        <span className="text-sm sm:text-base flex items-center gap-1">
                          <Wallet className="h-4 w-4" />
                          Wallet Deduction
                        </span>
                        <span className="font-medium text-sm sm:text-base">
                          -₹{walletDeduction.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Show coupon discount if applied */}
                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-[var(--cart-primary)]">
                        <span className="text-sm sm:text-base flex items-center gap-1">
                          <Ticket className="h-4 w-4" />
                          Coupon Discount ({appliedCoupon.code})
                        </span>
                        <span className="font-medium text-sm sm:text-base">
                          -₹{couponDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {superCoinDeduction > 0 && (
                      <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400">
                        <span className="text-sm sm:text-base flex items-center gap-1.5">
                          SuperCoins discount
                          <img src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                        </span>
                        <span className="font-medium text-sm sm:text-base">
                          -₹{superCoinDeduction.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base cart-text-secondary">
                        Processing Fee
                      </span>
                      <span className="font-medium text-sm sm:text-base cart-text-primary">
                        ₹{processingFee.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <span className="text-base sm:text-lg font-bold cart-text-primary">
                      Total to Pay
                    </span>
                    <div className="text-right">
                      <span className="text-2xl sm:text-3xl font-extrabold text-[var(--cart-primary)]">
                        ₹{uiTotalToPay.toFixed(2)}
                      </span>
                      {estimatedEarn > 0 && rewardMode === 'superCoins' && (
                        <p className="flex items-center justify-end gap-1 text-xs font-semibold cart-text-primary mt-0.5">
                          <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                          Earn {estimatedEarn.toFixed(2)} SuperCoins
                        </p>
                      )}
                    </div>
                  </div>

                  {estimatedEarn > 0 && rewardMode === 'superCoins' && (
                    <p className="text-center text-[10px] text-muted-foreground -mt-2">
                      Fractional SuperCoins are added to your next purchase.
                    </p>
                  )}

                  {/* Payment Gateway Selection - SINGLE SABBPE BUTTON */}
                  <div className="space-y-3">
                    <p className="text-xs text-center font-semibold uppercase tracking-wider cart-text-secondary">
                      Choose Payment Gateway
                    </p>

                    {/* SabbPe (Easebuzz) Button - Single centered button */}
                    <button
                      type="button"
                      className="cart-gradient-fill w-full h-12 rounded-2xl font-bold shadow-lg shadow-[rgba(108,92,231,0.25)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                      onClick={() => handlePayNow("easebuzz")}
                      disabled={
                        isProcessing || easebuzzScriptStatus !== "ready"
                      }
                    >
                      {easebuzzScriptStatus === "loading" ? (
                        "Loading..."
                      ) : easebuzzScriptStatus === "error" ? (
                        "Error"
                      ) : easebuzzPaymentMutation.isPending ? (
                        "Processing..."
                      ) : (
                        "Pay with SabbPe"
                      )}
                    </button>

                    {/* Loading/Error Status */}
                    {(createOrderMutation.isPending ||
                      validateCouponMutation.isPending ||
                      validateOrderMutation.isPending ||
                      generateTokenMutation.isPending) && (
                      <p className="text-xs text-center text-amber-200/80 animate-pulse">
                        {createOrderMutation.isPending && "Creating order..."}
                        {validateCouponMutation.isPending &&
                          "Validating coupon..."}
                        {validateOrderMutation.isPending &&
                          "Validating order..."}
                        {generateTokenMutation.isPending &&
                          "Generating secure token..."}
                      </p>
                    )}
                  </div>

                  <Link href="/brands">
                    <button
                      type="button"
                      className="cart-secondary-btn w-full h-11 rounded-2xl border border-[var(--cart-secondary)] font-semibold hover:brightness-105 active:scale-[0.98] transition-all"
                    >
                      Continue Shopping
                    </button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
          ) : (
          <div className="mt-6 space-y-4">
            <style>{`
              .voucher-tab-card-copy p {
                margin-top: 8px;
                font-family: Poppins, sans-serif;
                font-weight: 600;
                font-size: 16px;
                line-height: 100%;
                letter-spacing: 0%;
              }
            `}</style>
            {ordersLoading ? (
              <div className="mx-auto flex h-[120px] w-[342px] items-center justify-center rounded-[10px] border border-black/10 bg-white text-[#4B5563] shadow-[2px_4px_4px_rgba(0,0,0,0.18)]">
                <div className="flex items-center gap-3 text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-[#6D5AE6]" />
                  Loading your vouchers...
                </div>
              </div>
            ) : purchasedVouchers.length > 0 ? purchasedVouchers.map((item) => (
              <div
                key={item.itemId}
                className="mx-auto h-[120px] w-[342px] rounded-[10px] bg-white p-3 shadow-[2px_4px_4px_rgba(0,0,0,0.25)] font-['Poppins']"
              >
                <div className="flex h-full items-center gap-4">
                  <div className="h-[96px] w-[78px] overflow-hidden rounded-[6px] border border-black/10 bg-[#0E2D73]">
                    <img src={getImageUrl(item) || FALLBACK} alt={item.brandName} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.src = FALLBACK; }} />
                  </div>
                  <div className="h-[96px] w-[1px] bg-black/20" />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="voucher-tab-card-copy">
                      <h3 className="truncate text-[16px] font-semibold leading-[100%] tracking-[0%] text-black">{item.brandName} E-Gift Cards</h3>
                      <p className="mt-2 text-[40px] font-medium leading-[20px] text-black">₹ {item.unitValue}</p>
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div className="max-w-[150px] truncate rounded-[999px] bg-[#EDE9FE] px-4 py-2 text-[12px] font-semibold leading-[100%] tracking-[0%] text-[#5B3FFF]">
                        {item.cardNumber || "Voucher ready"}
                      </div>
                      <span className="text-[12px] font-semibold leading-[100%] tracking-[0%] text-black/60">{item.expiryDate || "Available now"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="mx-auto flex h-[120px] w-[342px] flex-col items-center justify-center rounded-[10px] border border-black/10 bg-white px-6 text-center shadow-[2px_4px_4px_rgba(0,0,0,0.18)]">
                <Ticket className="mb-2 h-6 w-6 text-[#6D5AE6]" />
                <p className="text-sm font-semibold text-black">No vouchers yet</p>
                <p className="mt-1 text-xs text-black/60">Purchased vouchers will appear here after a successful payment.</p>
              </div>
            )}
          </div>
          )}
        </section>
      </main>

      <AlertDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && cancelDelete()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold text-foreground">
                "{itemToDelete?.brandName}"
              </span>{" "}
              from your cart?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                await unholdSuperCoin();
                setRewardMode('cashbackWallet');
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

      <PaymentDetailsSheet
        brandId={sheetBrandId}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        showAddToCart={false}
        initialAmount={sheetAmount}
        initialQuantity={sheetQuantity}
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
            if (superCoinOrderNumber) {
              saveSuperCoinHoldForOrder(superCoinOrderNumber, context);
            }
            setSuperCoinOTPModalOpen(false);
          }}
          onSwitchToCashback={() => {
            setSuperCoinOTPModalOpen(false);
            setSuperCoinOrderNumber("");
            requestSwitchToCashback();
          }}
          identity={superCoinIdentity}
          merchantWalletId={superCoinMerchantWalletId}
          orderNumber={superCoinOrderNumber || checkoutState.orderNumber || ""}
          displayName={user?.name || "Gift360 Checkout"}
          preloadedBalance={superCoinState.balance}
          maxRedeemable={maxSuperCoinRedeemable}
        />
      )}
    </div>
  );
}


