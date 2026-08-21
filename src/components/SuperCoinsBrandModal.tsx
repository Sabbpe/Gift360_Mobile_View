import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ChevronLeft, Loader2, Check, Clock } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { fetchOrderDetails } from "@/api/orderApi";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSuperCoinAccount, useBurnSuperCoinOrder } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance, calculateSuperCoinsRequired, canAffordVoucher, normalizeMobileToE164 } from "@/api/supercoinApi";
import SuperCoinStatusCard from "@/components/SuperCoinStatusCard";
import SuperCoinOTPModal, { type SuperCoinHoldContext } from "@/components/SuperCoinOTPModal";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import type { OrderRequest } from "@/types/cart";

type Props = {
  open: boolean;
  brandId: string;
  onClose: () => void;
};

const FALLBACK = FALLBACK_IMAGE;
export const SUPERCOIN_FEATURED_BRAND_ID = "e6f0e8e0-784a-4877-9c95-826d53cbdf84";
export const SUPERCOIN_PIZZAHUT_BRAND_ID = "f0bcff25-e555-11f0-a1f2-4201c0a81e02";

export const SUPERCOIN_BRANDS = [
  { id: SUPERCOIN_FEATURED_BRAND_ID, label: "Flipkart B2B" },
  { id: SUPERCOIN_PIZZAHUT_BRAND_ID, label: "Pizza Hut", hidden: true },
] as const;

type ModalTab = "about" | "how" | "terms";

function formatCurrency(value: number): string {
  return `\u20b9${value.toLocaleString("en-IN")}`;
}

export default function SuperCoinsBrandModal({ open, brandId, onClose }: Props) {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const { toast } = useToast();
  const [selectedBrandId, setSelectedBrandId] = useState(brandId);
  const { data: brand, isLoading, isError, error } = useBrandDetails(selectedBrandId, {
    enabled: open && !!selectedBrandId,
  });
  const createOrderMutation = useCreateOrder();
  const burnMutation = useBurnSuperCoinOrder();
  const { identity: scIdentity, searchUserMutation, balanceMutation } = useSuperCoinAccount(user?.mobile);

  const [amount, setAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<ModalTab | null>("about");

  const [superCoinState, setSuperCoinState] = useState({ enabled: false, eligible: false, balance: 0 });
  const [superCoinOTPModalOpen, setSuperCoinOTPModalOpen] = useState(false);
  const [superCoinAuthorized, setSuperCoinAuthorized] = useState(false);
  const [superCoinHoldContext, setSuperCoinHoldContext] = useState<SuperCoinHoldContext | null>(null);
  const superCoinHoldContextRef = useRef<SuperCoinHoldContext | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [superCoinHoldExpiryMs, setSuperCoinHoldExpiryMs] = useState<number | null>(null);
  const [transactionTime, setTransactionTime] = useState<string | null>(null);
  const [burnSuccess, setBurnSuccess] = useState(false);
  const [burnError, setBurnError] = useState<{ title: string; description: string; balance?: number } | null>(null);
  const [burnResultData, setBurnResultData] = useState<{ coinsRedeemed?: number; coinsEarned?: number; balance?: number } | null>(null);
  const [orderDetailsCoinsEarned, setOrderDetailsCoinsEarned] = useState<number | null>(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);

  const superCoinMerchantWalletId =
    import.meta.env.VITE_SUPERCOIN_MERCHANT_WALLET_ID?.trim() || "";

  const normalizedSuperCoinMobile = useMemo(
    () => normalizeMobileToE164(user?.mobile),
    [user?.mobile]
  );

  const superCoinIdentity = normalizedSuperCoinMobile
    ? { identifier: normalizedSuperCoinMobile, type: "MOBILE" as const }
    : null;

  const min = Number(brand?.minPrice) || brand?.DenominationList?.[0] || 0;
  const max =
    Number(brand?.maxPrice) ||
    brand?.DenominationList?.[brand.DenominationList.length - 1] ||
    min;
  const isFixedType = brand?.BrandType?.toLowerCase() === "fixed";
  const discountPercent = Number(brand?.Discount) || 0;
  const sliderPercent = max > min ? ((amount - min) / (max - min)) * 100 : 0;

  const totalVoucherValue = amount * quantity;
  const superCoinsRequired = calculateSuperCoinsRequired(totalVoucherValue);
  const superCoinsEarned = Math.round(totalVoucherValue * 0.01 * 100) / 100;
  const hasEnoughCoins = canAffordVoucher(superCoinState.balance, totalVoucherValue);

  const calcCountdown = useCallback((txTime: string) => {
    const startMs = new Date(txTime).getTime();
    const endMs = startMs + 15 * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, endMs - now);
    const minutes = String(Math.floor(remaining / 60000)).padStart(2, "0");
    const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    return { display: `${minutes}:${seconds}`, minutes, seconds, expired: remaining <= 0 };
  }, []);

  const [countdown, setCountdown] = useState({ display: "15:00", minutes: "15", seconds: "00", expired: false });
  const timerRef = useRef<number>(0);

  useEffect(() => {
    if (!superCoinAuthorized || !transactionTime) return;
    let active = true;
    const tick = () => {
      if (!active) return;
      const next = calcCountdown(transactionTime);
      setCountdown(next);
      if (next.expired) {
        setSuperCoinAuthorized(false);
        setSuperCoinHoldContext(null);
        superCoinHoldContextRef.current = null;
        return;
      }
      timerRef.current = window.setTimeout(tick, 1000);
    };
    tick();
    return () => { active = false; window.clearTimeout(timerRef.current); };
  }, [superCoinAuthorized, transactionTime, calcCountdown]);

  useEffect(() => {
    if (!open) return;
    setSelectedBrandId(brandId);
    setActiveTab("about");
    setQuantity(1);
    setSuperCoinAuthorized(false);
    setSuperCoinHoldContext(null);
    superCoinHoldContextRef.current = null;
    setOrderNumber("");
    setSuperCoinHoldExpiryMs(null);
    setTransactionTime(null);
    setBurnSuccess(false);
    scSearchFiredRef.current = null;
    scBalanceFiredRef.current = null;
    burnMutation.reset();
  }, [open]);

  // Fetch SuperCoin balance when modal opens
  const scSearchFiredRef = useRef<string | null>(null);
  const scBalanceFiredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !scIdentity) return;
    const key = scIdentity.identifier;
    if (scSearchFiredRef.current === key) return;
    scSearchFiredRef.current = key;
    scBalanceFiredRef.current = null;
    searchUserMutation.reset();
    balanceMutation.reset();
    searchUserMutation.mutate();
  }, [open, scIdentity]);

  useEffect(() => {
    if (!scIdentity || !searchUserMutation.data) return;
    const userExists =
      searchUserMutation.data.userExists === true ||
      String(searchUserMutation.data.state || "").toUpperCase() === "ACTIVATED";
    if (!userExists) {
      setSuperCoinState((s) => ({ ...s, balance: 0, eligible: false }));
      return;
    }
    if (scBalanceFiredRef.current === scIdentity.identifier) return;
    scBalanceFiredRef.current = scIdentity.identifier;
    balanceMutation.mutate();
  }, [scIdentity, searchUserMutation.data]);

  useEffect(() => {
    if (!balanceMutation.data) return;
    const balance = extractSuperCoinBalance(balanceMutation.data);
    setSuperCoinState((s) => ({ ...s, balance, eligible: balance > 0 }));
  }, [balanceMutation.data]);

  useEffect(() => {
    if (!brand) return;
    if (isFixedType && brand.DenominationList?.length) {
      setAmount(brand.DenominationList[0]);
      return;
    }
    if (min > 0) setAmount(min);
  }, [brand, isFixedType, min]);

  const imageSrc = useMemo(() => {
    if (!brand) return FALLBACK;
    return getImageUrl(brand) || brand.ImageUrl || FALLBACK;
  }, [brand]);

  const aboutContent = brand?.Description || "No description available.";
  const termsContent =
    typeof brand?.Tnc === "string"
      ? brand.Tnc
      : Object.values(brand?.Tnc || {}).join("\n") || "No terms available.";

  // Step 1: Create order -> open OTP modal (initHold + authorizeHold happen inside OTP modal)
  const openSuperCoinFlow = useCallback(async () => {
    if (!superCoinIdentity || !user?.clientId || !brand) return;

    try {
      const today = new Date();
      const yymmdd =
        today.getFullYear().toString().slice(-2) +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
      const uuid = window.crypto.randomUUID();
      const newOrderNumber =
        "ORD" + yymmdd + uuid.replace(/-/g, "").slice(0, 12).toUpperCase();

      const orderRequest: OrderRequest = {
        order: {
          clientId: user.clientId,
          orderNumber: newOrderNumber,
          totalAmount: totalVoucherValue,
          currency: "INR",
          status: "PENDING",
          walletUsed: false,
          walletAmount: 0,
          earnCashback: false,
        },
        items: [
          {
            brandId: brand.BrandId,
            quantity,
            unitValue: amount,
            lineTotal: totalVoucherValue,
            meta: JSON.stringify({
              brand_name: brand.BrandName,
              brandId: brand.BrandId,
              image_url: imageSrc !== FALLBACK ? imageSrc : undefined,
              redeem_steps: brand.RedeemSteps || [],
            }),
          },
        ],
      };

      const orderResponse = await createOrderMutation.mutateAsync(orderRequest);
      setOrderNumber(orderResponse.orderNumber);
      setSuperCoinOTPModalOpen(true);
    } catch (err: any) {
      console.error("Failed to create order for SuperCoin burn", err);
      toast({
        title: "Unable to start",
        description: err?.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  }, [superCoinIdentity, user?.clientId, brand, totalVoucherValue, quantity, amount, imageSrc, createOrderMutation, toast]);

  // Step 3: After OTP authorized (initHold + authorizeHold done) -> call burn-and-order
  const handleBurnComplete = useCallback(async (_context: SuperCoinHoldContext) => {
    if (!superCoinIdentity || !orderNumber || !user?.clientId || !brand) return;

    try {
      const burnResult = await burnMutation.mutateAsync({
        orderNumber,
        displayName: brand.BrandName || "Gift360 Voucher",
        amount: totalVoucherValue,
        clientId: user.clientId,
      });

      if (burnResult?.success === false) {
        const code = burnResult.errorCode;
        let description = burnResult.message || burnResult.error || "SuperCoin conversion was not successful. Please try again.";
        let title = "Conversion failed";

        if (code === "VOUCHER_CONVERSION_FAILED") {
          title = "Voucher conversion failed";
          description = "Your coins have been refunded.";
          setSuperCoinAuthorized(false);
          setSuperCoinHoldContext(null);
          superCoinHoldContextRef.current = null;
        } else if (code === "COIN_REDEEM_FAILED") {
          title = "SuperCoin redemption failed";
          description = "Please try again.";
        }

        setBurnError({ title, description, balance: burnResult.balance ?? extractSuperCoinBalance(balanceMutation.data) });
        return;
      }

      setSuperCoinOTPModalOpen(false);
      setBurnSuccess(true);

      // Fetch order details for coinsEarned + coinsRedeemed, and fresh balance
      setOrderDetailsLoading(true);
      const balancePromise = scIdentity
        ? balanceMutation.mutateAsync()
        : Promise.resolve(null);
      const orderPromise = fetchOrderDetails(orderNumber).catch(() => null);

      Promise.all([balancePromise, orderPromise]).then(([balRes, details]) => {
        const freshBalance = balRes ? extractSuperCoinBalance(balRes) : null;
        const redeemed = details?.coinsRedeemed ?? burnResult?.coinsRedeemed ?? 0;
        setOrderDetailsCoinsEarned(details?.coinsEarned ?? burnResult?.coinsEarned ?? superCoinsEarned);
        setBurnResultData({
          coinsRedeemed: redeemed,
          coinsEarned: details?.coinsEarned ?? burnResult?.coinsEarned ?? superCoinsEarned,
          balance: freshBalance,
        });
      }).finally(() => {
        setOrderDetailsLoading(false);
      });
    } catch (err: any) {
      console.error("SuperCoin burn failed", err);
      const is500 = err?.response?.status === 500 || err?.status === 500;
      const fallbackBalance = extractSuperCoinBalance(balanceMutation.data);
      setBurnError({
        title: "Conversion failed",
        description: is500 ? "Voucher conversion failed. Coins refunded." : err?.message || "Failed to complete SuperCoin conversion. Please try again.",
        balance: err?.response?.data?.balance ?? err?.data?.balance ?? fallbackBalance,
      });
    }
  }, [superCoinIdentity, orderNumber, user?.clientId, brand, totalVoucherValue, burnMutation, toast]);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setBurnSuccess(false);
      setBurnError(null);
      setBurnResultData(null);
      setOrderDetailsCoinsEarned(null);
      setOrderDetailsLoading(false);
      setSuperCoinAuthorized(false);
      setSuperCoinHoldContext(null);
      superCoinHoldContextRef.current = null;
      setOrderNumber("");
      setSuperCoinHoldExpiryMs(null);
      setTransactionTime(null);
      burnMutation.reset();
    }, 300);
  }, [onClose, burnMutation]);

  const handleGoToOrders = useCallback(() => {
    handleClose();
    setTimeout(() => setLocation("/orders"), 100);
  }, [handleClose, setLocation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[6px]" onClick={handleClose} />

      <div className="absolute inset-x-0 bottom-0 flex justify-center px-3">
        <section className="relative flex h-[600px] w-full max-w-[390px] flex-col overflow-hidden rounded-t-[38px] bg-[#F3F5F9] shadow-[0_-18px_50px_rgba(0,0,0,0.28)]">
          <style>{`
            .sc-sheet-content {
              flex: 1;
              min-height: 0;
              overflow-y: auto;
              overflow-x: hidden;
              padding: 12px 16px 24px;
              -webkit-overflow-scrolling: touch;
              scroll-behavior: smooth;
            }
            .sc-top-card {
              position: relative;
              margin: 0 auto;
              width: 100%;
              box-shadow: 0px 6px 20px rgba(0,0,0,0.15);
              border-radius: 16px;
              background: #FFFFFF;
            }
            .sc-amount-box {
              margin: 10px auto 0;
              width: 100%;
            }
            .sc-payment-range {
              -webkit-appearance: none;
              appearance: none;
              width: 100%;
              height: 10px;
              border-radius: 10px;
              outline: none;
              background: #DAD5FF;
            }
            .sc-payment-range::-webkit-slider-runnable-track {
              height: 10px;
              border-radius: 10px;
              background: transparent;
            }
            .sc-payment-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #6C5CE7;
              border: 1px solid #FFFFFF;
              margin-top: -2.5px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.22);
            }
            .sc-payment-range::-moz-range-track {
              height: 10px;
              border-radius: 10px;
              background: #DAD5FF;
            }
            .sc-payment-range::-moz-range-progress {
              height: 10px;
              border-radius: 10px;
              background: linear-gradient(90deg, #9747FF, #5B2B99);
            }
            .sc-payment-range::-moz-range-thumb {
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #6C5CE7;
              border: 1px solid #FFFFFF;
              box-shadow: 0 1px 3px rgba(0,0,0,0.22);
            }
            .sc-amount-bubble::after {
              content: "";
              position: absolute;
              left: 50%;
              bottom: -6px;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid #2F80ED;
            }
          `}</style>

          {/* Header */}
          <div className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-4 text-white">
            <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)]" />
            <button
              onClick={handleClose}
              aria-label="Back"
              className="relative z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.3} />
            </button>
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-[0.24em] text-[#f7d46b]">
                SUPERCOINS
              </p>
              <h3 className="truncate text-[16px] font-bold leading-tight">
                {brand?.BrandName || "Loading brand..."}
              </h3>
            </div>
          </div>

          {/* Brand selector pills */}
          <div className="relative z-10 flex shrink-0 gap-2 px-4 pb-3 -mt-1">
            {SUPERCOIN_BRANDS.filter((b) => !b.hidden).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  if (b.id === selectedBrandId) return;
                  setSelectedBrandId(b.id);
                  setSuperCoinAuthorized(false);
                  setSuperCoinHoldContext(null);
                  superCoinHoldContextRef.current = null;
                  scSearchFiredRef.current = null;
                  scBalanceFiredRef.current = null;
                  setBurnSuccess(false);
                  setBurnError(null);
                  setBurnResultData(null);
                  setOrderDetailsCoinsEarned(null);
                  setOrderDetailsLoading(false);
                }}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  selectedBrandId === b.id
                    ? "bg-white text-[#7C3AED]"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Success state - rendered outside scroll container for proper centering */}
          {!isLoading && !isError && burnSuccess && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-[#101828]">Voucher Purchased!</h3>
              <p className="mt-2 text-sm text-[#667085]">
                Your {brand?.BrandName} voucher has been purchased.
              </p>
              {burnResultData && (
                <div className="mt-3 w-full max-w-[320px] rounded-lg border bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.25)] p-3 text-left">
                  <div className="flex items-center gap-2 text-sm text-[#7C3AED] font-medium">
                    <img src={superCoinIcon} alt="" className="h-4 w-4" />
                    <span>SuperCoin Reward</span>
                  </div>
                  {orderDetailsLoading ? (
                    <p className="mt-1 text-sm text-[#7C3AED]">
                      Fetching earned coins...
                    </p>
                  ) : orderDetailsCoinsEarned != null ? (
                    <p className="mt-1 text-sm text-[#7C3AED]">
                      You earned {orderDetailsCoinsEarned.toFixed(2)} SuperCoins for this order.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[#7C3AED]">
                      SuperCoins earned will appear here once the order is processed.
                    </p>
                  )}
                </div>
              )}
              {burnResultData && (
                <div className="mt-2 w-full max-w-[320px] space-y-1">
                  {burnResultData.balance != null && (
                    <p className="text-[13px] text-black font-bold flex items-center gap-1.5">
                      <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                      Balance: {burnResultData.balance} coins
                    </p>
                  )}
                  {burnResultData.coinsRedeemed != null && (
                    <p className="text-[13px] text-black font-bold flex items-center gap-1.5">
                      <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                      Redeemed: {burnResultData.coinsRedeemed} coins
                    </p>
                  )}
                </div>
              )}
              <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
                <button
                  onClick={handleGoToOrders}
                  className="w-full h-11 rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)]"
                >
                  View in Orders
                </button>
                <button
                  onClick={handleClose}
                  className="w-full h-10 rounded-[10px] bg-[#F3F4F6] text-[12px] font-medium text-[#667085]"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Burn error state */}
          {!isLoading && !burnSuccess && burnError && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-500" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-[#101828]">{burnError.title}</h3>
              <p className="mt-2 text-sm text-[#667085]">
                {burnError.description}
              </p>
              {burnError.balance != null && (
                <div className="mt-3 w-full max-w-[320px] rounded-lg border bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.25)] p-3">
                  <div className="flex items-center gap-2 text-sm text-[#7C3AED] font-medium">
                    <img src={superCoinIcon} alt="" className="h-4 w-4" />
                    <span>Your SuperCoins balance: <span className="font-semibold">{burnError.balance}</span></span>
                  </div>
                </div>
              )}
              <div className="mt-6 flex w-full max-w-[320px] flex-col gap-3">
                <button
                  onClick={() => {
                    setBurnError(null);
                    setSuperCoinAuthorized(false);
                    setSuperCoinHoldContext(null);
                    superCoinHoldContextRef.current = null;
                  }}
                  className="w-full h-11 rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)]"
                >
                  Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="w-full h-10 rounded-[10px] bg-[#F3F4F6] text-[12px] font-medium text-[#667085]"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Content - only show when not in success or error state */}
          {!burnSuccess && !burnError && (
          <div className="sc-sheet-content">
            {/* Loading */}
            {isLoading && (
              <div className="flex min-h-[320px] items-center justify-center rounded-[18px] bg-white">
                <div className="flex flex-col items-center gap-3 text-[#667085]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#7C3AED]" />
                  <p className="text-sm font-medium">Loading SuperCoins details...</p>
                </div>
              </div>
            )}

            {/* Error */}
            {!isLoading && isError && (
              <div className="rounded-[18px] bg-white p-5 text-center shadow-[0_4px_18px_rgba(15,23,42,0.08)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE4E2]">
                  <AlertCircle className="h-5 w-5 text-[#B42318]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[#101828]">
                  Could not load SuperCoins brand details
                </p>
                <p className="mt-1 text-xs text-[#667085]">
                  {(error as Error)?.message || "Please try again."}
                </p>
              </div>
            )}

            {/* Brand content */}
            {!isLoading && !isError && brand && !burnSuccess && (
              <>
                {/* Brand card */}
                <div className="sc-top-card overflow-hidden">
                  <div className="flex h-full items-center gap-3 p-3">
                    <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F3F4F6]">
                      <img
                        src={imageSrc}
                        alt={brand.BrandName}
                        className="h-full w-full object-contain"
                        onError={(e) => { e.currentTarget.src = FALLBACK; }}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pr-[70px]">
                      <div className="truncate text-[16px] font-semibold leading-[24px] text-black">
                        {brand.BrandName}
                      </div>
                      <div className="truncate text-[16px] font-semibold leading-[24px] text-black">
                        E-Gift Cards
                      </div>
                      <div className="mt-1 inline-flex min-h-[20px] min-w-[145px] items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#78DEFF_50%,#488599_100%)] px-3 py-1 text-[10px] font-normal leading-[15px] text-black shadow-[0px_2px_4px_rgba(120,222,255,0.5)]">
                        {brand.Category || "Gift voucher"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount selection */}
                <div
                  className="sc-amount-box overflow-hidden bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.15)]"
                  style={{ borderRadius: 10, padding: "14px 14px" }}
                >
                  <div className="text-[12px] font-semibold leading-[18px] text-black">
                    Select Amount
                  </div>

                  {min > 0 && min === max ? (
                    <div className="mt-[4px]">
                      <div className="flex flex-wrap gap-[6px]">
                        <button className="h-[34px] rounded-[8px] border-2 border-[#9747FF] bg-[#9747FF] px-3 text-[12px] font-semibold leading-[18px] text-white shadow-lg">
                          {formatCurrency(min)}
                        </button>
                      </div>
                      {discountPercent > 0 && (
                        <div className="mt-[2px]">
                          <span className="relative inline-block rounded text-[15px] font-medium leading-[22px] text-[#10B981]">
                            +{formatCurrency(Math.round(min * discountPercent / 100))} cashback
                          </span>
                        </div>
                      )}
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
                              {formatCurrency(denom)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="relative mt-[4px] px-[4px] pt-[14px]">
                      <div
                        className="sc-amount-bubble pointer-events-none absolute top-[-30px] z-10 rounded-[6px] bg-[#2F80ED] px-2 py-1 text-[12px] font-normal leading-[15px] text-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                        style={{
                          left: `${Math.max(0, Math.min(100, sliderPercent))}%`,
                          transform: "translateX(-50%)",
                        }}
                      >
                        {formatCurrency(amount)}
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={1}
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="sc-payment-range"
                        style={{
                          background: `linear-gradient(90deg, #9747FF 0%, #5B2B99 ${sliderPercent}%, #DAD5FF ${sliderPercent}%, #DAD5FF 100%)`,
                        }}
                      />
                      <div className="mt-[4px] flex justify-between text-[8px] leading-[12px] text-black">
                        <span>{formatCurrency(min)}</span>
                        <span>{formatCurrency(max)}</span>
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div className="mt-[8px] border-t border-[#A1A1A1] pt-[8px]">
                    <div className="text-[12px] font-semibold leading-[18px] text-black">
                      Quantity:
                    </div>
                    <div className="mt-[4px] flex items-center justify-between">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <input
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(3, Math.max(1, Number(e.target.value) || 1)))}
                        className="mx-[8px] h-[30px] w-[221px] rounded-[5px] border border-[#9747FF] bg-white text-center text-[12px] font-bold leading-[18px] text-[#4E4E4E] outline-none"
                        inputMode="numeric"
                        aria-label="Quantity"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(3, quantity + 1))}
                        disabled={quantity >= 3}
                        className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <div className="mt-[8px] text-center text-[15px] leading-[22px] text-black">
                      Total: {formatCurrency(amount)} x {quantity} ={" "}
                      <span className="font-semibold text-[#9747FF]">
                        {formatCurrency(totalVoucherValue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SuperCoin burn info + CTA */}
                {superCoinIdentity && !superCoinAuthorized && (
                  <div className="mt-3 rounded-[12px] bg-white p-3 shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium text-[#667085]">SuperCoins needed</span>
                      <span className="text-[13px] font-bold text-[#9747FF] flex items-center gap-1">
                        <img src={superCoinIcon} alt="" className="h-4 w-4" />
                        {superCoinsRequired.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-medium text-[#667085]">Your balance</span>
                      <span className={`text-[13px] font-bold ${hasEnoughCoins ? "text-emerald-600" : "text-red-500"} flex items-center gap-1`}>
                        <img src={superCoinIcon} alt="" className="h-4 w-4" />
                        {superCoinState.balance.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {!hasEnoughCoins && (
                      <p className="text-[10px] text-red-500 mb-3">
                        Minimum {superCoinsRequired.toLocaleString("en-IN")} SuperCoins required
                      </p>
                    )}

                    {superCoinsEarned > 0 && (
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1">
                          <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                          Earn {superCoinsEarned.toFixed(2)} SuperCoins
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => void openSuperCoinFlow()}
                      disabled={!hasEnoughCoins || createOrderMutation.isPending || burnMutation.isPending}
                      className="w-full h-[42px] rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[12px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap px-2"
                    >
                      {createOrderMutation.isPending || burnMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {burnMutation.isPending ? "Converting..." : "Creating order..."}
                        </>
                      ) : (
                        <>
                          <img src={superCoinIcon} alt="" className="h-4 w-4" />
                          Convert your Supercoins
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* SuperCoin active hold state */}
                {superCoinAuthorized && superCoinHoldContext && (
                  <div className="mt-3 rounded-[12px] bg-[rgba(151,71,255,0.08)] border border-[rgba(151,71,255,0.25)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#7C3AED] flex items-center gap-1.5">
                        SuperCoins applied
                        <img src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                      </span>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-[#7C3AED] underline"
                        onClick={() => {
                          setSuperCoinAuthorized(false);
                          setSuperCoinHoldContext(null);
                          superCoinHoldContextRef.current = null;
                        }}
                      >
                        Remove
                      </button>
                    </div>
                    {transactionTime && !countdown.expired && (
                      <p className="mt-1 text-[11px] font-medium text-[#7C3AED] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Use within {countdown.display}
                      </p>
                    )}
                    {countdown.expired && (
                      <p className="mt-1 text-[11px] font-medium text-red-500">
                        Hold expired. Please apply again.
                      </p>
                    )}
                    {superCoinsEarned > 0 && (
                      <p className="mt-1 text-[11px] font-medium text-[#7C3AED] flex items-center gap-1">
                        <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                        Earn {superCoinsEarned.toFixed(2)} SuperCoins
                      </p>
                    )}
                    <button
                      onClick={() => void handleBurnComplete(superCoinHoldContext)}
                      disabled={burnMutation.isPending || countdown.expired}
                      className="w-full h-[40px] mt-2 rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {burnMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Confirm
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Info tabs */}
                <div className="mx-auto mt-3 flex h-[44px] w-full items-center justify-between rounded-[10px] bg-white px-2 shadow-[0px_6px_20px_rgba(0,0,0,0.15)]">
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "about" ? null : "about")}
                    className="inline-flex h-[30px] w-[71px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
                  >
                    <span className="text-[16px] leading-none">i</span>
                    About
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "how" ? null : "how")}
                    className="inline-flex h-[30px] w-[102px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
                  >
                    <span className="text-[16px] leading-none">*</span>
                    How to Use
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "terms" ? null : "terms")}
                    className="inline-flex h-[30px] w-[73px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
                  >
                    <span className="text-[16px] leading-none">#</span>
                    Terms
                  </button>
                </div>

                <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: activeTab ? "400px" : "0px", opacity: activeTab ? 1 : 0 }}>
                  <div className="mx-auto mt-3 w-full rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                    {activeTab === "about" && aboutContent}
                    {activeTab === "how" && (
                      brand?.RedeemSteps?.length ? (
                        brand.RedeemSteps.map((step, index) => (
                          <div key={`${step.title || step.description || index}`} className="mb-2 last:mb-0">
                            {step.title || step.description || "Step"}
                            {step.description ? ` - ${step.description}` : ""}
                          </div>
                        ))
                      ) : (
                        <span>No instructions available.</span>
                      )
                    )}
                    {activeTab === "terms" && (
                      <span className="whitespace-pre-line">{termsContent}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          )}
        </section>
      </div>

      {/* SuperCoin OTP Modal */}
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
            setSuperCoinOTPModalOpen(false);
          }}
          onSwitchToCashback={() => {
            setSuperCoinOTPModalOpen(false);
            setOrderNumber("");
          }}
          identity={superCoinIdentity}
          merchantWalletId={superCoinMerchantWalletId}
          orderNumber={orderNumber}
          displayName={brand?.BrandName || "Gift360 SuperCoin"}
          preloadedBalance={superCoinState.balance}
          maxRedeemable={superCoinsRequired}
        />
      )}
    </div>
  );
}
