import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ChevronLeft, Loader2, Check, Clock } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useCart } from "@/hooks/useCart";
import { fetchOrderDetails } from "@/api/orderApi";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSuperCoinAccount, useBurnSuperCoinOrder } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance, calculateSuperCoinsRequired, canAffordVoucher, normalizeMobileToE164, fetchSuperCoinConfig, fetchSuperCoinModalBrands, type SuperCoinModalBrand } from "@/api/supercoinApi";
import SuperCoinStatusCard from "@/components/SuperCoinStatusCard";
import SuperCoinExpiryCard, { SUPERCOIN_CLAIM_URL } from "@/components/SuperCoinExpiryCard";
import { superCoinConversionConfig } from "@/config/features.config";
import SuperCoinOTPModal, { type SuperCoinHoldContext } from "@/components/SuperCoinOTPModal";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import scScrollableNewImg from "@/assets/ScScrollableNew.png";
import type { OrderRequest } from "@/types/cart";

type Props = {
  open: boolean;
  brandId: string;
  onClose: () => void;
};

const FALLBACK = FALLBACK_IMAGE;
// Last-resort earn % shown before the DB-backed config resolves. The live
// value comes from the SuperCoin brand row (giftvouchers_brands
// .earn_percent_special_sku, V41) via GET /v1/supercoin/config.
const FALLBACK_SUPERCOIN_EARN_PERCENT = 5;
const SUPERCOIN_EARN_CAP = 100;
const SUPERCOIN_EARN_MIN_DENOMINATION = 100;
export const SUPERCOIN_FEATURED_BRAND_ID = "c1ae829e-0e78-4dfe-8432-c4c1ac9360e1";
export const SUPERCOIN_PIZZAHUT_BRAND_ID = "f0bcff25-e555-11f0-a1f2-4201c0a81e02";

export const SUPERCOIN_BRANDS = [
  { id: SUPERCOIN_FEATURED_BRAND_ID, label: "SuperCoin E-Gift Voucher", hidden: false },
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
  const { addToCart } = useCart(user?.clientId);
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

  // Live SuperCoin conversion rules from GET /v1/supercoin/config (served
  // from the SuperCoin brand row, V41). fetchSuperCoinConfig applies the
  // returned burnRatio to the module-level ratio that
  // calculateSuperCoinsRequired reads, so the coins-required figure below
  // tracks the DB with no prop plumbing; we only need the earn % in local
  // state. Both fall back to the pre-V41 hardcoded values until the fetch
  // resolves or if it fails.
  const [earnPercentSpecialSku, setEarnPercentSpecialSku] = useState<number>(
    FALLBACK_SUPERCOIN_EARN_PERCENT
  );

  useEffect(() => {
    if (!open) return;
    fetchSuperCoinConfig()
      .then((config) => {
        if (typeof config.earnPercentSpecialSku === "number" && config.earnPercentSpecialSku > 0) {
          setEarnPercentSpecialSku(config.earnPercentSpecialSku);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch SuperCoin config, using fallback earn percent:", err);
      });
  }, [open]);

  // Brands shown in the modal and how each is paid for (giftvouchers_brands.supercoin_pay_mode, V47).
  const [modalBrands, setModalBrands] = useState<SuperCoinModalBrand[]>([]);
  useEffect(() => {
    if (!open) return;
    fetchSuperCoinModalBrands()
      .then((list) => {
        setModalBrands(list);
        // Always open on the first brand in DB order (supercoin_modal_order).
        if (list.length > 0) {
          const first = list[0];
          setSelectedBrandId(
            first.payMode === "SC_ONLY" || first.brandId === SUPERCOIN_FEATURED_BRAND_ID
              ? SUPERCOIN_FEATURED_BRAND_ID
              : first.brandId
          );
        }
      })
      .catch((err) => console.warn("Could not fetch SuperCoin modal brands:", err));
  }, [open]);

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

  // CASH_EARN brand: pay cash (UPI/card) and earn SuperCoins back instead of cashback.
  const selectedModalBrand = modalBrands.find((b) => b.brandId === selectedBrandId);
  const isCashEarn = selectedModalBrand?.payMode === "CASH_EARN";
  const cashEarnPercent = Number(selectedModalBrand?.earnPercent) || 0;

  const totalVoucherValue = amount * quantity;
  const superCoinsRequired = calculateSuperCoinsRequired(totalVoucherValue);
  const isAmountValid = amount >= min && amount <= max;
  const isFivePercentEarnSku =
    String(brand?.BrandCode || "").trim().toUpperCase() === "EGCGBFKSCR001";
  const qualifiesForSuperCoinEarn = isFivePercentEarnSku
    && amount >= SUPERCOIN_EARN_MIN_DENOMINATION;
  const showSuperCoinEarnThreshold = isFivePercentEarnSku
    && isAmountValid
    && amount > 0
    && !qualifiesForSuperCoinEarn;
  const superCoinsEarnPotential = qualifiesForSuperCoinEarn
    ? Math.round(Math.min(totalVoucherValue * (earnPercentSpecialSku / 100), SUPERCOIN_EARN_CAP) * 100) / 100
    : 0;
  const hasEnoughCoins = isAmountValid && canAffordVoucher(superCoinState.balance, totalVoucherValue);
  const cashEarnCoins = isAmountValid && cashEarnPercent > 0
    ? Math.round(totalVoucherValue * cashEarnPercent) / 100
    : 0;

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
    if (!superCoinIdentity || !user?.clientId || !brand || !isAmountValid) return;

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
          paymentMethod: "SUPERCOIN",
        },
        items: [
          {
            brandId: brand.BrandId,
            quantity,
            unitValue: amount,
            lineTotal: totalVoucherValue,
      meta: JSON.stringify({
        brand_name: brand.BrandName,
        brand_code: brand.BrandCode,
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
        description:
          err?.response?.data?.message || err?.response?.data?.detail ||
          err?.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
    }
  }, [superCoinIdentity, user?.clientId, brand, isAmountValid, totalVoucherValue, quantity, amount, imageSrc, createOrderMutation, toast]);

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
        setOrderDetailsCoinsEarned(details?.coinsEarned ?? burnResult?.coinsEarned ?? null);
        setBurnResultData({
          coinsRedeemed: redeemed,
          coinsEarned: details?.coinsEarned ?? burnResult?.coinsEarned,
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

  // CASH_EARN: add the brand to the cart and open it in SuperCoins reward mode, so the order is placed
  // with cashback off and the SuperCoins are credited after the voucher is issued.
  const handleCashEarnBuy = useCallback(() => {
    if (!brand || !isAmountValid) return;
    addToCart(
      {
        brandId: brand.BrandId,
        brandName: brand.BrandName,
        quantity,
        unitValue: Number(amount),
        image: imageSrc,
      },
      {
        onSuccess: () => {
          try { sessionStorage.setItem("gift360.cartRewardMode", "superCoins"); } catch { /* storage unavailable */ }
          onClose();
          setTimeout(() => setLocation("/cart"), 100);
        },
      }
    );
  }, [brand, isAmountValid, addToCart, quantity, amount, imageSrc, onClose, setLocation]);

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

      <div className="absolute inset-x-0 bottom-[63px] flex justify-center px-3">
        <section className="relative flex h-[600px] w-full max-w-[390px] flex-col overflow-hidden rounded-t-[38px] bg-[#F3F5F9] shadow-[0_-18px_50px_rgba(0,0,0,0.28)]">
          <style>{`
            .sc-sheet-content {
              flex: 1;
              min-height: 0;
              overflow-y: auto;
              overflow-x: hidden;
              padding: 8px 16px 24px;
              -webkit-overflow-scrolling: touch;
              scroll-behavior: smooth;
            }
            .sc-sheet-content::-webkit-scrollbar {
              width: 6px;
            }
            .sc-sheet-content::-webkit-scrollbar-track {
              background: transparent;
            }
            .sc-sheet-content::-webkit-scrollbar-thumb {
              background: rgba(148, 163, 184, 0.45);
              border-radius: 999px;
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
          `}</style>

          {/* Header + brand chips share one purple background that grows with the chip rows */}
          <div className="shrink-0 bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)]">
          <div className="relative flex shrink-0 items-center gap-3 px-4 pb-3 pt-4 text-white">
            <button
              onClick={handleClose}
              aria-label="Back"
              className="relative z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" strokeWidth={2.3} />
            </button>
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-[11px] font-bold tracking-[0.24em] text-[#f7d46b]">
                SUPERCOINS
              </p>
              <h3 className="truncate text-[16px] font-bold leading-tight">
                {brand?.BrandName || "Loading brand..."}
              </h3>
            </div>
          </div>

          {/* Brand selector pills: order comes from the DB (supercoin_modal_order) */}
          <div className="relative z-10 flex shrink-0 flex-wrap gap-2 px-4 pb-3 -mt-1">
            {(() => {
              // Chips come strictly from the API list, in the DB order (supercoin_modal_order).
              const isVoucher = (b: SuperCoinModalBrand) =>
                b.brandId === SUPERCOIN_FEATURED_BRAND_ID ||
                b.payMode === "SC_ONLY";
              const chips = modalBrands.map((b) => ({
                id: isVoucher(b) ? SUPERCOIN_FEATURED_BRAND_ID : b.brandId,
                label: isVoucher(b)
                  ? "SuperCoin E-Gift Voucher"
                  : (Number(b.earnPercent) > 0 ? `${b.brandName} ${Number(b.earnPercent)}%` : b.brandName),
              }));
              // Only before the list loads (or if the API fails): show the voucher chip alone.
              return chips.length > 0
                ? chips
                : [{ id: SUPERCOIN_FEATURED_BRAND_ID, label: "SuperCoin E-Gift Voucher" }];
            })().map((b) => (
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
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  selectedBrandId === b.id
                    ? "bg-white text-[#7C3AED]"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
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
                    <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
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
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                      Balance: {burnResultData.balance} coins
                    </p>
                  )}
                  {burnResultData.coinsRedeemed != null && (
                    <p className="text-[13px] text-black font-bold flex items-center gap-1.5">
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline" />
                      Redeemed: {burnResultData.coinsRedeemed} coins
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4 w-full max-w-[320px] rounded-lg bg-white p-3 text-left shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                <p className="text-[12px] font-bold text-[#101828]">Redeem your voucher for fresh SuperCoins</p>
                <ol className="mt-1.5 space-y-1">
                  {(brand?.RedeemSteps || []).map((step: any, index: number) => (
                    <li key={index} className="flex gap-2 text-[12px] leading-snug text-[#475467]">
                      <span className="mt-[1px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#EDEAFF] text-[11px] font-bold text-[#7C3AED]">
                        {index + 1}
                      </span>
                      <span>{step.title || step.name}{step.description ? ` - ${step.description}` : ""}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-1.5 text-[11px] text-[#667085]">Your voucher code and PIN are in Orders.</p>
              </div>
              <div className="mt-4 flex w-full max-w-[320px] flex-col gap-3">
                <a
                  href={SUPERCOIN_CLAIM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)]"
                >
                  <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                  Redeem your voucher
                </a>
                <button
                  onClick={handleGoToOrders}
                  className="w-full h-10 rounded-[10px] border border-[#9747FF] bg-white text-[12px] font-semibold text-[#7C3AED]"
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
                    <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
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
                {/* Expiry-extension message (Flipkart entry) */}
                {!superCoinAuthorized && !isCashEarn && (
                  <SuperCoinExpiryCard
                    coinsNeeded={superCoinsRequired}
                    voucherValue={totalVoucherValue}
                    balance={superCoinState.balance}
                    loggedIn={!!superCoinIdentity}
                    balanceLoading={searchUserMutation.isPending || balanceMutation.isPending}
                    canConvert={hasEnoughCoins}
                    busy={createOrderMutation.isPending || burnMutation.isPending}
                    paused={superCoinConversionConfig.paused}
                    pausedMessage={superCoinConversionConfig.pausedMessage}
                    onConvert={() => void openSuperCoinFlow()}
                    onLogin={() => setLocation("/login")}
                  />
                )}

                {/* Brand card */}
                <div className="sc-top-card overflow-hidden">
                  <div className="flex h-full items-center gap-3 p-3">
                    <div className="h-[70px] w-[120px] shrink-0 overflow-hidden rounded-[10px] bg-white">
                      <img loading="lazy" decoding="async"
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
                      <div className="mt-1 inline-flex min-h-[20px] min-w-[145px] items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#78DEFF_50%,#488599_100%)] px-3 py-1 text-[11px] font-normal leading-[15px] text-black shadow-[0px_2px_4px_rgba(120,222,255,0.5)]">
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
                  {isFivePercentEarnSku && (
                    <div className="mt-2 flex items-start gap-2 rounded-[9px] border border-[#E8DCFF] bg-[#F8F4FF] px-2.5 py-2">
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p className="text-[11px] font-medium leading-[15px] text-[#6B46A5]">
                        Buy vouchers starting at ₹100 and earn up to 5% cashback in SuperCoins!
                      </p>
                    </div>
                  )}

                  {min > 0 && min === max ? (
                    <div className="mt-[4px]">
                      <div className="flex flex-wrap gap-[6px]">
                        <button className="h-[34px] rounded-[8px] border-2 border-[#9747FF] bg-[#9747FF] px-3 text-[12px] font-semibold leading-[18px] text-white shadow-lg">
                          {formatCurrency(min)}
                        </button>
                      </div>
                      {discountPercent > 0 && !isCashEarn && (
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
                    <div className="mt-[4px]">
                      <div className="mb-[6px] flex items-center gap-[4px] text-[12px] font-medium leading-[16px] text-[#555]">
                        <span className="inline-block h-[4px] w-[4px] rounded-full bg-[#9747FF]" />
                        Enter amount between {formatCurrency(min)} - {formatCurrency(max)}
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount === 0 ? "" : amount}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setAmount(raw === "" ? 0 : Number(raw));
                        }}
                        onBlur={() => {
                          if (!isAmountValid) setAmount(0);
                        }}
                        aria-label="Voucher amount"
                        aria-invalid={amount !== 0 && !isAmountValid}
                        placeholder={`${min} - ${max}`}
                        className={`w-full rounded-[8px] border-2 bg-white px-3 py-2 text-[12px] font-medium text-[#3E3E3E] outline-none transition-colors focus:ring-1 ${
                          amount !== 0 && !isAmountValid
                            ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                            : "border-[#DAD5FF] focus:border-[#9747FF] focus:ring-[#9747FF]"
                        }`}
                      />
                      {amount !== 0 && !isAmountValid && (
                        <p className="mt-1 text-[11px] text-red-500">
                          Enter an amount from {formatCurrency(min)} to {formatCurrency(max)}.
                        </p>
                      )}
                      {isAmountValid && discountPercent > 0 && !isCashEarn && (
                        <p className="mt-[4px] text-right text-[11px] font-medium text-[#10B981]">
                          +{formatCurrency(Math.round(amount * discountPercent / 100))} cashback
                        </p>
                      )}
                      <div className="mt-[4px] flex justify-between text-[10px] leading-[12px] text-black">
                        <span>Min {formatCurrency(min)}</span>
                        <span>Max {formatCurrency(max)}</span>
                      </div>
                      {!isCashEarn && (
                      <div className="mt-[6px] flex items-center justify-center gap-1.5 text-[11px] font-semibold leading-[15px] text-[#7C3AED]">
                        <span>Earn upto 5% SuperCoins</span>
                        <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline-block" />
                        <span>upto 100 SuperCoins</span>
                      </div>
                      )}
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

                <a
                  href="https://www.flipkart.com/free-super-coin-at-store?param=9988770"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Grab Free SuperCoins — earn up to 1,500 coins"
                  className="mt-3 block overflow-hidden rounded-[12px] shadow-[0_4px_14px_rgba(37,99,235,0.18)] transition-transform active:scale-[0.99]"
                >
                  <img loading="lazy" decoding="async"
                    src={scScrollableNewImg}
                    alt="Grab Free SuperCoins. Earn up to 1,500 coins. Start earning now."
                    className="block h-auto w-full object-contain"
                  />
                </a>

                {/* CASH_EARN: pay cash, earn SuperCoins back */}
                {isCashEarn && (
                  <div className="mt-3 rounded-[12px] bg-white p-3 shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    <div className="mb-3 flex items-start gap-2 rounded-[9px] border border-[#E8DCFF] bg-[#F8F4FF] px-2.5 py-2">
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p className="text-[11px] font-medium leading-[15px] text-[#6B46A5]">
                        Pay with UPI or card and earn {cashEarnPercent > 0 ? `${cashEarnPercent}% ` : ""}back in SuperCoins.
                        You earn SuperCoins instead of wallet cashback on this order.
                      </p>
                    </div>
                    {cashEarnCoins > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[12px] font-medium text-[#667085]">
                          <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5" />
                          You earn about {cashEarnCoins.toFixed(2)} SuperCoins
                        </span>
                      </div>
                    )}
                    {!isAmountValid && (
                      <p className="mb-3 text-[11px] text-red-500">Enter a valid voucher amount to continue.</p>
                    )}
                    <button
                      onClick={handleCashEarnBuy}
                      disabled={!isAmountValid}
                      className="w-full h-[42px] rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] text-[12px] font-semibold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap px-2"
                    >
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                      {cashEarnCoins > 0 ? `Buy and earn ${cashEarnCoins.toFixed(2)} SuperCoins` : "Buy and earn SuperCoins"}
                    </button>
                  </div>
                )}

                {/* SuperCoin burn info + CTA */}
                {superCoinIdentity && !superCoinAuthorized && !isCashEarn && (
                  <div className="mt-3 rounded-[12px] bg-white p-3 shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[12px] font-medium text-[#667085]">Your balance</span>
                      <span className={`text-[13px] font-bold ${hasEnoughCoins ? "text-emerald-600" : "text-red-500"} flex items-center gap-1`}>
                        <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                        {superCoinState.balance.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {!isAmountValid ? (
                      <p className="mb-3 text-[11px] text-red-500">
                        Enter a valid voucher amount to continue.
                      </p>
                    ) : !hasEnoughCoins ? (
                      <p className="text-[11px] text-red-500 mb-3">
                        You don&apos;t have enough SuperCoins for this voucher.
                      </p>
                    ) : null}

                    {superCoinsEarnPotential > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[12px] font-medium text-[#667085]">
                          <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5" />
                          Earn up to {superCoinsEarnPotential.toFixed(2)} SC
                        </span>
                      </div>
                    )}
                    {showSuperCoinEarnThreshold && (
                      <div aria-live="polite" className="mb-3 flex items-start gap-2 rounded-[9px] border border-[#E8DCFF] bg-[#F8F4FF] px-2.5 py-2">
                        <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p className="text-[11px] leading-[15px] text-[#6B46A5]">
                          This denomination is below ₹100, so it won’t earn SuperCoins. Choose ₹100 or more to qualify.
                        </p>
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
                          <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                          Convert your Supercoins
                        </>
                      )}
                    </button>
                  </div>
                )}

                {!superCoinIdentity && !superCoinAuthorized && !isCashEarn && (
                  <div className="mt-3 rounded-[12px] bg-white p-3 shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    <p className="mb-3 text-[12px] font-medium leading-snug text-[#667085]">
                      Login to convert your SuperCoins into vouchers.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation("/login")}
                      className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(90deg,#9747FF,#5B2B99)] py-2.5 text-[12px] font-bold text-white shadow-[0_4px_12px_rgba(151,71,255,0.3)] active:scale-[0.98] transition-transform"
                    >
                      <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-4 w-4" />
                      Login/Register to Convert
                    </button>
                  </div>
                )}

                {/* SuperCoin active hold state */}
                {superCoinAuthorized && superCoinHoldContext && (
                  <div className="mt-3 rounded-[12px] bg-[rgba(151,71,255,0.08)] border border-[rgba(151,71,255,0.25)] p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#7C3AED] flex items-center gap-1.5">
                        SuperCoins applied
                        <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-5 w-5 inline" />
                      </span>
                      <button
                        type="button"
                        className="text-[12px] font-medium text-[#7C3AED] underline"
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
                      <p className="mt-1 text-[12px] font-medium text-[#7C3AED] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Use within {countdown.display}
                      </p>
                    )}
                    {countdown.expired && (
                      <p className="mt-1 text-[12px] font-medium text-red-500">
                        Hold expired. Please apply again.
                      </p>
                    )}
                    {superCoinsEarnPotential > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#7C3AED]">
                        <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-3.5 w-3.5" />
                        Earn up to {superCoinsEarnPotential.toFixed(2)} SC
                      </p>
                    )}
                    {showSuperCoinEarnThreshold && (
                      <p aria-live="polite" className="mt-1 text-[11px] leading-[15px] text-[#6B46A5]">
                        This denomination is below ₹100, so it won’t earn SuperCoins.
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
                <div className="info-section mx-auto flex h-[44px] w-full items-center justify-between rounded-[10px] bg-white px-2 shadow-[0px_6px_20px_rgba(0,0,0,0.15)]">
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

                <div className={`expandable ${activeTab ? "open" : ""}`}>
                  {activeTab === "about" && (
                    <div className="info-section mx-auto w-full rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                      {aboutContent}
                    </div>
                  )}

                  {activeTab === "how" && (
                    <div className="info-section mx-auto w-full rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
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
                    <div className="info-section mx-auto w-full rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] whitespace-pre-line">
                      {termsContent}
                    </div>
                  )}
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
