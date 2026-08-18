import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useCart } from "@/hooks/useCart";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import type { BrandDetailsParsed } from "@/types/brandDetails";

const FALLBACK = FALLBACK_IMAGE;
const SELECTED_TOP_BRAND_DETAILS_KEY = "selected_top_brand_details";
const MAX_QUANTITY_PER_ITEM = 3;

type TabKey = "about" | "howToUse" | "terms";

function getBrandImage(details: BrandDetailsParsed | null): string {
  if (!details) return FALLBACK;
  return getImageUrl(details) || FALLBACK;
}

function renderTerms(tnc: BrandDetailsParsed["Tnc"]) {
  if (!tnc) return <p className="text-sm text-[#6B7280]">No terms available.</p>;

  if (typeof tnc === "string") {
    return <p className="whitespace-pre-line text-sm leading-6 text-[#4B5563]">{tnc}</p>;
  }

  return (
    <ul className="space-y-2">
      {Object.values(tnc).map((value, index) => (
        <li key={`term-${index}`} className="text-sm leading-6 text-[#4B5563]">
          {index + 1}. {value}
        </li>
      ))}
    </ul>
  );
}

export default function BrandPaymentPage() {
  const [, params] = useRoute("/payment-details/:id");
  const brandId = (params as { id?: string } | null)?.id || "";

  const { data } = useBrandDetails(brandId, { enabled: !!brandId });
  const [brandDetails, setBrandDetails] = useState<BrandDetailsParsed | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("about");

  const { user } = useAuthContext();
  const { addToCart } = useCart(user?.clientId);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const payClickedRef = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(SELECTED_TOP_BRAND_DETAILS_KEY);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as BrandDetailsParsed;
      if (parsed?.BrandId === brandId) {
        setBrandDetails(parsed);
      }
    } catch {
      sessionStorage.removeItem(SELECTED_TOP_BRAND_DETAILS_KEY);
    }
  }, [brandId]);

  useEffect(() => {
    if (data) {
      setBrandDetails(data);
      sessionStorage.setItem(
        SELECTED_TOP_BRAND_DETAILS_KEY,
        JSON.stringify(data)
      );
    }
  }, [data]);

  useEffect(() => {
    if (!brandDetails) return;

    const min = Number(brandDetails.minPrice) || 0;
    const max = Number(brandDetails.maxPrice) || min;
    const firstDenomination = brandDetails.DenominationList?.[0];

    if (brandDetails.BrandType?.toLowerCase() === "fixed" && firstDenomination) {
      setSelectedAmount(firstDenomination);
      return;
    }

    setSelectedAmount(Math.max(min, Math.min(max, min)));
  }, [brandDetails]);

  const minAmount = Number(brandDetails?.minPrice) || 0;
  const maxAmount = Number(brandDetails?.maxPrice) || minAmount;

  const safeAmount = useMemo(() => {
    if (!brandDetails) return 0;
    return Math.max(minAmount, Math.min(maxAmount, selectedAmount || minAmount));
  }, [brandDetails, selectedAmount, minAmount, maxAmount]);

  const total = safeAmount * quantity;
  const imageSrc = getBrandImage(brandDetails);

  const howToUseContent = useMemo(() => {
    if (!brandDetails) return [] as string[];

    if (brandDetails.RedeemSteps?.length) {
      return brandDetails.RedeemSteps.map((step) => step.description || step.title).filter(Boolean);
    }

    if (brandDetails.ImportantInstruction) {
      return Object.values(brandDetails.ImportantInstruction);
    }

    return [] as string[];
  }, [brandDetails]);

  const handlePayOnSabbpe = () => {
    if (!brandDetails || !safeAmount || payClickedRef.current) return;

    // Client-side denomination validation for fixed-denomination brands
    if (brandDetails.BrandType?.toLowerCase() === "fixed") {
      const denominations = brandDetails.DenominationList || [];
      if (denominations.length > 0 && !denominations.includes(safeAmount)) {
        toast({
          title: "Invalid amount",
          description: "Please select a valid denomination for this gift card.",
          variant: "destructive",
        });
        return;
      }
    }

    payClickedRef.current = true;

    addToCart(
      {
        brandId: brandDetails.BrandId,
        brandName: brandDetails.BrandName,
        quantity,
        unitValue: safeAmount,
        image: imageSrc !== FALLBACK ? imageSrc : undefined,
      },
      {
        onSuccess: () => setLocation("/cart?autopay=easebuzz"),
        onError: () => {
          payClickedRef.current = false;
        },
      }
    );
  };

  if (!brandDetails) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6">
        <p className="text-sm text-[#6B7280]">Loading brand details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-32">
      <div className="mx-auto w-full max-w-md px-4 pt-4">
        <Link href="/">
          <button className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#374151]">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </Link>

        <section className="relative rounded-2xl bg-white p-4 shadow-[0px_6px_16px_rgba(0,0,0,0.12)]">
          <span className="absolute right-3 top-3 rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-semibold text-[#4C1D95]">
            {brandDetails.Discount > 0 ? `${brandDetails.Discount}% Cashback` : "Voucher"}
          </span>

          <div className="flex items-start gap-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl bg-[#F3F4F6] p-2">
              <img src={imageSrc} alt={brandDetails.BrandName} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 pr-24">
              <h1 className="truncate text-lg font-bold text-[#111827]">{brandDetails.BrandName}</h1>
              <span className="mt-2 inline-flex rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-3 py-1 text-xs font-medium text-white">
                {brandDetails.Category || "Gift Voucher"}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0px_6px_16px_rgba(0,0,0,0.12)]">
          <p className="text-sm font-semibold text-[#111827]">Selected Amount</p>
          <p className="mt-1 text-2xl font-bold text-[#111827]">₹{safeAmount.toLocaleString()}</p>

          <input
            type="range"
            min={minAmount}
            max={maxAmount}
            step={1}
            value={safeAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gradient-to-r from-[#7C3AED] to-[#C4B5FD] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#7C3AED] [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#7C3AED]"
          />
          <div className="mt-2 flex justify-between text-xs text-[#6B7280]">
            <span>₹{minAmount.toLocaleString()}</span>
            <span>₹{maxAmount.toLocaleString()}</span>
          </div>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0px_6px_16px_rgba(0,0,0,0.12)]">
          <p className="text-sm font-semibold text-[#111827]">Quantity</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[#D1D5DB]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              value={quantity}
              onChange={(e) => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Number(e.target.value) || 1)))}
              className="h-10 flex-1 rounded-lg border border-[#D1D5DB] text-center text-sm font-semibold"
            />
            <button
              onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY_PER_ITEM, value + 1))}
              disabled={quantity >= MAX_QUANTITY_PER_ITEM}
              className="grid h-10 w-10 place-items-center rounded-lg border border-[#D1D5DB] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {quantity >= MAX_QUANTITY_PER_ITEM && (
            <p className="mt-1 text-xs text-[#6B7280]">
              Maximum {MAX_QUANTITY_PER_ITEM} of the same gift card per order.
            </p>
          )}
          <p className="mt-3 text-base font-bold text-[#111827]">Total: ₹{total.toLocaleString()}</p>
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0px_6px_16px_rgba(0,0,0,0.12)]">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setActiveTab("about")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === "about" ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-[#4B5563]"
              }`}
            >
              About
            </button>
            <button
              onClick={() => setActiveTab("howToUse")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === "howToUse" ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-[#4B5563]"
              }`}
            >
              How to Use
            </button>
            <button
              onClick={() => setActiveTab("terms")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                activeTab === "terms" ? "bg-[#111827] text-white" : "bg-[#F3F4F6] text-[#4B5563]"
              }`}
            >
              Terms
            </button>
          </div>

          {activeTab === "about" && (
            <p className="text-sm leading-6 text-[#4B5563]">{brandDetails.Description || "No description available."}</p>
          )}

          {activeTab === "howToUse" && (
            <div className="space-y-2">
              {howToUseContent.length ? (
                howToUseContent.map((item, index) => (
                  <p key={`how-${index}`} className="text-sm leading-6 text-[#4B5563]">
                    {index + 1}. {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-[#6B7280]">No instructions available.</p>
              )}
            </div>
          )}

          {activeTab === "terms" && renderTerms(brandDetails.Tnc)}
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E7EB] bg-white px-4 py-3">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-[#111827]">₹{total.toLocaleString()}</p>
            <p className="text-xs text-[#6B7280]">Instant delivery via email</p>
          </div>
          <button
            onClick={handlePayOnSabbpe}
            className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-sm"
          >
            Pay on Sabbpe
          </button>
        </div>
      </div>
    </div>
  );
}
