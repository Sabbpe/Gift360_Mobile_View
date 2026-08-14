import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Minus, Plus } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import type { BrandDetailsParsed } from "@/types/brandDetails";
import { useLocation } from "wouter";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";

function getImage(b: BrandDetailsParsed | null) {
  if (!b) return FALLBACK_IMAGE;
  return getImageUrl(b) || FALLBACK_IMAGE;
}

const MAX_QUANTITY_PER_ITEM = 3;

export default function BrandBuySheet({
  brandId,
  open,
  onClose,
}: {
  brandId?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data } = useBrandDetails(brandId || "", { enabled: !!brandId && open });
  const [brand, setBrand] = useState<BrandDetailsParsed | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<null | "about" | "how" | "terms">(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuthContext();
  const { addToCart } = useCart(user?.clientId);
  const [, setLocation] = useLocation();

  useEffect(() => {
    setBrand(data || null);
  }, [data]);

  useEffect(() => {
    if (!brand) return;
    const min = Number(brand.minPrice) || 0;
    const max = Number(brand.maxPrice) || min;
    if (brand.BrandType?.toLowerCase() === "fixed" && brand.DenominationList?.length) {
      setAmount(brand.DenominationList[0]);
      return;
    }
    setAmount(min || max);
  }, [brand]);

  useEffect(() => {
    if (!open) {
      // reset minimal tab state when closing
      setActiveTab(null);
      setQuantity(1);
    }
  }, [open]);

  const min = Number(brand?.minPrice) || 0;
  const max = Number(brand?.maxPrice) || min;
  const total = amount * quantity;

  const handlePay = () => {
    if (!brand || !amount || quantity < 1) return;
    // reuse existing payment flow by adding to cart and redirecting to cart autopay
    addToCart({
      brandId: brand.BrandId,
      brandName: brand.BrandName,
      quantity,
      unitValue: amount,
      image: getImage(brand) !== FALLBACK ? getImage(brand) : undefined,
    });
    // close sheet first for UX
    onClose();
    // route to cart with autopay flag (Cart handles autopay)
    setLocation("/cart?autopay=easebuzz");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        ref={sheetRef}
        className="w-full max-w-3xl z-50 bg-white rounded-t-[24px] shadow-2xl"
        style={{
          height: '88vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease-in-out',
        }}
      >
        {/* drag handle + header */}
        <div className="px-4 pt-3 pb-2 border-b border-gray-100">
          <div className="mx-auto mb-2 w-12 h-1.5 rounded-full bg-gray-200" />
          <div className="flex items-center justify-between">
            <button onClick={onClose} aria-label="Close" className="p-2">
              <ArrowUp className="h-4 w-4 text-gray-600 rotate-180" />
            </button>
            <h3 className="text-base font-semibold">Payment Details</h3>
            <div className="w-8" />
          </div>
        </div>

        <div className="p-4 overflow-y-auto h-[calc(88vh-140px)]">
          {/* Brand Card */}
          <div className="flex items-center gap-3 rounded-xl p-4 shadow-md bg-white">
            <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
              <img src={getImage(brand)} alt={brand?.BrandName} className="w-full h-full object-contain p-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold truncate">{brand?.BrandName}</h4>
                  <p className="text-sm text-gray-500">E-Gift Card</p>
                </div>
                {brand?.Discount ? (
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-[#7C3AED] to-[#C4B5FD] text-white text-xs font-semibold">
                    {brand.Discount}% Cashback
                  </div>
                ) : null}
              </div>
              <div className="mt-2">
                <span className="inline-block rounded-full bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-3 py-1 text-xs text-white font-medium">
                  {brand?.Category || 'Gift Voucher'}
                </span>
              </div>
            </div>
          </div>

          {/* Select Amount */}
          <div className="mt-4">
            <h5 className="text-sm font-semibold">Select Amount</h5>
            <div className="mt-2 flex items-center justify-center">
              <div className="text-lg font-bold">₹{amount.toLocaleString()}</div>
            </div>

            <div className="relative mt-3">
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full h-2 appearance-none rounded-full"
                style={{
                  background: `linear-gradient(90deg,#7C3AED ${( (amount - min) / Math.max(1, max-min) ) * 100}%, #E6E6F7 0%)`,
                }}
              />
              {/* value bubble */}
              <div
                className="absolute -top-8 w-max transform -translate-x-1/2 rounded-md bg-[#7C3AED] px-2 py-1 text-xs text-white"
                style={{ left: `${Math.max(0, Math.min(100, ((amount - min) / Math.max(1, max - min)) * 100))}%` }}
              >
                ₹{amount.toLocaleString()}
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>₹{min.toLocaleString()}</span>
              <span>₹{max.toLocaleString()}</span>
            </div>
          </div>

          {/* Quantity */}
          <div className="mt-4">
            <label className="text-sm font-semibold">Quantity</label>
            <div className="mt-2 flex items-center gap-3 border border-purple-400 rounded-lg p-2 w-max">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2">
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                value={quantity}
                min={1}
                max={MAX_QUANTITY_PER_ITEM}
                onChange={(e) => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 text-center border-none outline-none"
              />
              <button
                onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, quantity + 1))}
                disabled={quantity >= MAX_QUANTITY_PER_ITEM}
                className="p-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {quantity >= MAX_QUANTITY_PER_ITEM && (
              <p className="mt-1 text-xs text-[#6B7280]">
                Maximum {MAX_QUANTITY_PER_ITEM} of the same gift card per order.
              </p>
            )}
          </div>

          {/* Total */}
          <div className="mt-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold">₹{total.toLocaleString()}</div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab(activeTab === 'about' ? null : 'about')}
                className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'about' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700'}`}>
                About
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'how' ? null : 'how')}
                className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'how' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700'}`}>
                How to Use
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'terms' ? null : 'terms')}
                className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === 'terms' ? 'bg-purple-500 text-white' : 'bg-purple-100 text-purple-700'}`}>
                Terms
              </button>
            </div>

            <div className="mt-3">
              {activeTab === 'about' && (
                <p className="text-sm text-gray-600">{brand?.Description}</p>
              )}
              {activeTab === 'how' && (
                <div className="text-sm text-gray-600 space-y-2">
                  {brand?.RedeemSteps?.map((s, i) => (
                    <div key={i}>{s.title}{s.description ? ` - ${s.description}` : ''}</div>
                  ))}
                </div>
              )}
              {activeTab === 'terms' && (
                <div className="text-sm text-gray-600">{typeof brand?.Tnc === 'string' ? brand?.Tnc : Object.values(brand?.Tnc || {}).join('\n')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom payment bar inside sheet */}
        <div className="absolute left-0 right-0 bottom-0 z-50 p-4 border-t border-gray-100 bg-white">
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-bold">₹{total.toLocaleString()}</div>
              <div className="text-xs text-gray-500">Instant delivery via email</div>
            </div>
            <button
              onClick={handlePay}
              className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-sm"
            >
              Pay on Sabbpe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
