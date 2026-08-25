import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Kill switch for SuperCoin conversion now lives in features.config.ts —
// it's the single source of truth shared with Hero.tsx (and anywhere else
// that can open the SuperCoins modal). Do not redeclare a local copy here.
import { superCoinConversionConfig } from "@/config/features.config";
const SUPERCOIN_CONVERSION_PAUSED = superCoinConversionConfig.paused;
const SUPERCOIN_PAUSED_MESSAGE = superCoinConversionConfig.pausedMessage;

// The dedicated "convert SuperCoins" home button now routes into the same
// checkout flow used for any normal brand purchase (cashback-vs-SuperCoins
// choice, the real 20/80 split, the platform fee) rather than the old,
// separate burn-and-order mechanism -- with this one brand pre-selected.
// EGCGBFKBS001/burn-and-order stay in the codebase, just unused from here.
const FLIPKART_B2C_BRAND_ID = "73e3d992-d87e-43e4-aed3-e87cfe6952f5";
import {
  Loader2,
  ChevronLeft,
  Bell,
  Eye,
  EyeOff,
  AlertCircle,
  Gift,
  Search,
  Package,
  UserRoundPlus,
  Home as HomeIcon,
  Grid2X2,
  Store,
  ShoppingCart,
  Send,
  WalletCards,
  User,
} from "lucide-react";
import Hero from "@/components/Hero";
import Header from "@/components/Header";
import SuperCoinHeaderIcon from "@/components/SuperCoinHeaderIcon";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import BrandVoucherModal from "@/components/BrandVoucherModal";
import CategoriesBottomSheet from "../components/CategoriesBottomSheet.tsx";
import InstantGiftingBanner from "@/components/InstantGiftingBanner";
import SuperCoinsBrandModal, { SUPERCOIN_FEATURED_BRAND_ID } from "@/components/SuperCoinsBrandModal";
import WhatsHotSection, { type MatchedBrand } from "@/components/RecentlyBoughtSection";
import homebackImg from "@/assets/homeback.jpeg";
import { cartBrandNames } from "@/data/recentlyBought";
import FeedbackForm from "@/components/FeedbackForm";
import FeedbackFloatingButton from "@/components/FeedbackFloatingButton";
import { Input } from "@/components/ui/input";
import { useOccasions } from "@/hooks/useOccasions";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useBrandNames } from "@/hooks/useBrandNames";
import type { Brand } from "@/types/brand";
import gWord from "@/assets/G word.png";
import giftcardbg from "@/assets/giftcardbg.png";
import rakhiBannerImg from "@/assets/rakhibanner.png";
import giftLogo from "@/assets/Gift.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import certfLogo from "@/assets/certf logo.png";
import { isSuperCoinExcludedById, isSuperCoinExcluded } from "@/lib/supercoin-excluded-brands";
import { getImageUrl } from "@/utils/imageUrl";
import { fetchBrandVoucherList, fetchTopBrands, type TopBrandVoucher } from "@/api/brandSearchApi";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { brandApi } from "@/lib/valuedesignApi";

type BrandItem = {
  name: string;
  image?: string;
  brandId?: string;
};

function getRecommendedBrandImage(brand: Brand): string | null {
  return getImageUrl(brand);
}

function HomeHeader({ onSuperCoinClick }: { onSuperCoinClick: () => void }) {
  const [, setLocation] = useLocation();
  const { user } = useAuthContext();
  const displayName = localStorage.getItem("displayName") || user?.name || "User";
  const firstName = displayName.split(" ")[0];

  return (
    <header className="relative h-[142px] overflow-hidden rounded-b-[34px] bg-[linear-gradient(135deg,#523da9_0%,#4c42b8_48%,#5365df_100%)] px-[21px] pt-[40px] text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-[23px] font-bold leading-none tracking-[-0.01em]">Hi {firstName || "User"}!</h1>
        <div className="flex items-center gap-[14px]">
          <div className="relative">
            <SuperCoinHeaderIcon onClick={onSuperCoinClick} frozen={SUPERCOIN_CONVERSION_PAUSED} />
            <span className="absolute -top-2.5 -right-3 z-10 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[6px] font-bold text-white shadow-md overflow-hidden"
              style={{
                background: "linear-gradient(90deg, #7C3AED, #EC4899, #3B82F6, #7C3AED)",
                backgroundSize: "300% 100%",
                animation: "new-feature-pulse 2s ease-in-out infinite, gradient-shift 3s ease-in-out infinite",
              }}>
              <span className="relative z-10">Try Now</span>
              <span className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                <span className="absolute top-0 h-full w-[40%] -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ animation: "shimmer-sweep 2.5s ease-in-out infinite" }} />
              </span>
            </span>
          </div>
          <button onClick={() => setLocation("/notifications")} className="grid h-[20px] w-[20px] place-items-center active:scale-95" aria-label="Notifications">
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
          <button onClick={() => setLocation("/profile")} className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#e99da8] text-white active:scale-95" aria-label="Profile">
            <User className="h-[14px] w-[14px]" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}

function BalanceCard() {
  const [visible, setVisible] = useState(true);
  const { user } = useAuthContext();
  const { data: walletData } = useFetchWallet(user?.clientId);
  const balance = walletData?.totalBalance ?? 0;

  return (
    <section className="absolute left-0 right-0 top-[86px] z-30 mx-auto w-[90%] max-w-[350px] overflow-visible">
      <div className="relative h-[130px] overflow-hidden rounded-[18px] shadow-[0_18px_38px_rgba(27,25,75,0.24)] animate-[float-y_4s_ease-in-out_infinite]">
        <img src={giftcardbg} alt="" className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none scale-110" />
        <div className="relative h-full px-[24px] py-[14px] text-black">
          <p className="text-[13px] font-normal leading-none tracking-[-0.01em] text-black">Your CashBack points</p>
        <div className="relative mt-[12px] flex items-center gap-[14px]">
          <p className="text-[0px] font-bold leading-none tracking-[-0.035em] text-black">
            <span className="text-[22px]">{visible ? `\u20b9 ${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "\u20b9 \u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</span>
            {visible ? `₹ ${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ •••••••"}
          </p>
          <button onClick={() => setVisible((value) => !value)} className="mt-[4px] active:scale-95" aria-label="Toggle balance">
            {visible ? <EyeOff className="h-[19px] w-[19px]" strokeWidth={1.7} /> : <Eye className="h-[19px] w-[19px]" strokeWidth={1.7} />}
          </button>
        </div>
        <div className="absolute bottom-[6px] right-[10px] flex items-center gap-1.5 bg-white/90 rounded-full pl-2 pr-3 py-1 shadow-sm">
          <style>{`
            @keyframes gold-pulse-badge {
              0%, 100% { filter: drop-shadow(0 0 2px rgba(255,200,0,0.3)); transform: scale(1); }
              50% { filter: drop-shadow(0 0 8px rgba(255,200,0,0.8)) drop-shadow(0 0 16px rgba(255,180,0,0.4)); transform: scale(1.1); }
            }
          `}</style>
          <img src={superCoinImg} alt="SuperCoin" className="h-[16px] w-[16px] object-contain" style={{ animation: "gold-pulse-badge 1.5s ease-in-out infinite" }} />
          <span className="text-[8px] font-semibold bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] bg-clip-text text-transparent">SuperCoins now available on</span>
          <img src={gWord} alt="Gift360" className="h-[12px] w-auto object-contain" />
        </div>
        </div>
      </div>
    </section>
  );
}

function ActionGrid({ onBuyVoucher, onSuperCoinClick }: { onBuyVoucher: () => void; onSuperCoinClick?: () => void }) {
  const [, setLocation] = useLocation();
  const actions = [
    { label: "Buy Voucher", Icon: Gift, href: "/brands", onClick: onBuyVoucher },
    { label: "Near by stores", Icon: Send, href: "/nearby", isNew: true },
    { label: "Orders", Icon: Package, href: "/orders" },
    { label: "Partner with Us", Icon: UserRoundPlus, href: "/distributor" },
  ];

  return (
    <section className="px-[21px] pt-[18px]">
      <style>{`
        @keyframes new-feature-pulse {
          0%, 100% { opacity: 1; transform: scale(1) translateY(0); box-shadow: 0 0 4px rgba(124,58,237,0.3); }
          50% { opacity: 0.9; transform: scale(1.08) translateY(-1px); box-shadow: 0 0 14px rgba(124,58,237,0.7), 0 0 24px rgba(59,130,246,0.3); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer-sweep {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
      <div className="grid grid-cols-4 gap-[17px] pt-[18px]">
        {actions.map(({ label, Icon, href, onClick, isNew }) => (
          <button key={label} onClick={onClick || (() => setLocation(href))} className="flex flex-col items-center active:scale-95 relative">
            {isNew && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[6px] font-bold text-white shadow-md overflow-hidden"
                style={{
                  background: "linear-gradient(90deg, #7C3AED, #EC4899, #3B82F6, #7C3AED)",
                  backgroundSize: "300% 100%",
                  animation: "new-feature-pulse 2s ease-in-out infinite, gradient-shift 3s ease-in-out infinite",
                }}>
                <span className="relative z-10">Try Now</span>
                <span className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                  <span className="absolute top-0 h-full w-[40%] -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{ animation: "shimmer-sweep 2.5s ease-in-out infinite" }} />
                </span>
              </span>
            )}
            <span className="grid h-[43px] w-[43px] place-items-center rounded-[6px] bg-[#f1f2f8] shadow-[4px_5px_7px_rgba(21,28,74,0.19)]">
              <Icon className="h-[27px] w-[27px] text-[#092a92]" strokeWidth={label === "Orders" ? 2.2 : 2.4} fill={label === "Buy Voucher" ? "#092a92" : "none"} />
            </span>
            <span className="mt-[7px] h-[18px] w-[65px] text-center text-[8px] font-bold leading-[9px] text-[#161616]">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PromoCard() {
  const [, setLocation] = useLocation();

  return (
    <section className="px-[21px] pt-[18px]">
      <InstantGiftingBanner onExplore={() => setLocation("/brands")} onPartnerClick={() => setLocation("/distributor")} />
    </section>
  );
}

function RakhiBanner() {
  const [, setLocation] = useLocation();

  return (
    <section className="px-3 pt-[18px]">
      <div className="relative w-full h-[100px] rounded-[16px] overflow-hidden">
        <img src={rakhiBannerImg} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="relative h-full flex flex-col justify-center px-8 py-2 z-10">
          <h2 className="text-[16px] font-extrabold leading-[1.1] text-[#2D1B4E]">
            Make <span className="text-[#D946A8]">Rakhi</span>{" "}Extra Special
          </h2>
          <p className="mt-1 text-[8px] font-medium leading-snug text-[#5B4C69] max-w-[180px]">
            From thoughtful gifts to exciting vouchers, make every bond stronger.
          </p>
          <button
            onClick={() => setLocation("/brands")}
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#D946A8] px-3 py-1.5 text-[9px] font-semibold text-white shadow-md active:scale-[0.97] transition-all w-fit"
          >
            Explore Gifts
            <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function SearchSection({ onBrandSelect }: { onBrandSelect: (brandId: string) => void }) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { data: brandNames = [] } = useBrandNames();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();

    return (brandNames as any[])
      .filter((brand: any) =>
        (brand.BrandName || brand.brandName || "")
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 8);
  }, [brandNames, searchQuery]);

  return (
    <section className="relative px-[21px] pt-[18px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => {
            if (searchQuery.trim()) setShowSuggestions(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && searchQuery.trim()) {
              setLocation(`/brands?search=${encodeURIComponent(searchQuery.trim())}`);
              setShowSuggestions(false);
            }
          }}
          placeholder="Search Rakhi gifts & vouchers..."
          className="h-[44px] rounded-[16px] border border-[#e5e7eb] bg-white pl-10 pr-4 text-[13px] font-medium shadow-[0_4px_10px_rgba(0,0,0,0.06)]"
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            {filteredSuggestions.map((brand: any, index: number) => (
              <button
                key={`${brand.BrandId || brand.brandId || brand.BrandName}-${index}`}
                onClick={() => {
                  const brandId = brand.BrandId || brand.brandId;
                  if (brandId) {
                    onBrandSelect(brandId);
                  }
                  setSearchQuery("");
                  setShowSuggestions(false);
                }}
                className="flex w-full flex-col gap-0.5 border-b border-[#f3f4f6] px-4 py-3 text-left last:border-0"
              >
                <span className="text-sm font-semibold text-[#111827]">
                  {brand.BrandName || brand.brandName}
                </span>
                {brand.Category && (
                  <span className="text-xs text-[#6b7280]">{brand.Category}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RecommendedList({ onBuy }: { onBuy?: (id: string) => void }) {
  const occasion = import.meta.env.VITE_RECOMMENDATION_OCCASION || "Rakhi";
  const { data: recommended = [], isLoading } = useRecommendations(occasion);
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <section className="pt-[27px]">
        <div className="inline-block bg-white rounded-xl px-3 py-1 ml-[21px]">
          <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">Rakhi Recommendations</h2>
        </div>
        <div className="no-scrollbar mt-[11px] flex gap-3 overflow-x-auto px-[21px] pb-[3px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-[120px] min-w-[120px] h-[80px] rounded-[8px] bg-white animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!recommended.length) return null;

  return (
    <section className="pt-[27px]">
      <div className="inline-block bg-white rounded-xl px-3 py-1 ml-[21px]">
        <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">Rakhi Recommendations</h2>
      </div>
      <div className="no-scrollbar mt-[11px] flex snap-x gap-3 overflow-x-auto scroll-smooth px-[21px] pb-[3px]">
        {recommended.map((brand: any) => {
          const brandId = brand.BrandId || brand.brandId || brand.id || brand.brand_id;
          const brandName = brand.BrandName || brand.brandName || brand.brand_name || "";
          const images = brand.Images || brand.images || brand.image || {};
          const imageSrc = images?.raw || images?.text || images?.mobile || images?.featured || images?.base || images?.small || "";
          const minP = Number(brand.MinPrice || brand.minPrice) || 0;
          const maxP = Number(brand.MaxPrice || brand.maxPrice) || 0;
          const priceValue = minP > 0 ? minP : maxP > 0 ? maxP : 0;

          return (
            <article
              key={brandId}
              className="w-[120px] min-w-[120px] h-[80px] snap-start flex-shrink-0 rounded-[8px] bg-white"
              style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.08)', padding: 8, position: 'relative' }}
            >
              <div className="flex items-start gap-2" style={{ height: 32 }}>
                <div className="flex-shrink-0" style={{ width: 40, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imageSrc ? (
                    <img src={imageSrc} alt={brandName} style={{ width: 34, height: 28, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 34, height: 28 }} />
                  )}
                </div>
                <div className="min-w-0" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-[12px] font-semibold text-[#111827] truncate">{brandName}</span>
                    <span className="text-[10px] text-[#6B7280] truncate">{priceValue > 0 ? `\u20b9${priceValue.toLocaleString()} Voucher` : 'Voucher'}</span>
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: '#E5E7EB', marginTop: 6, marginBottom: 6 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="text-[12px] font-bold text-[#111827]">{priceValue > 0 ? `\u20b9${priceValue.toLocaleString()}` : '-'}</div>
                <button
                  onClick={() => { if (onBuy) onBuy(brandId); else setLocation(`/brand/${brandId}`); }}
                  style={{ background: 'linear-gradient(90deg,#7C3AED,#3B82F6)', color: 'white', padding: '6px 10px', borderRadius: 18, fontSize: 11, fontWeight: 600 }}
                >
                  Buy
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OccasionPicksSection({
  occasion,
  onOpenBrand,
}: {
  occasion: string;
  onOpenBrand: (brandId: string) => Promise<void> | void;
}) {
  const { data: recommended = [], isLoading } = useQuery({
    queryKey: ["occasion-brands", occasion],
    queryFn: () => fetchTopBrands(occasion),
    enabled: !!occasion,
    staleTime: 5 * 60 * 1000,
  });
  const [loadingBrandId, setLoadingBrandId] = useState<string | null>(null);

  if (!isLoading && !recommended.length) return null;

  const handleBrandClick = async (brandId: string) => {
    try {
      setLoadingBrandId(brandId);
      await onOpenBrand(brandId);
    } finally {
      setLoadingBrandId(null);
    }
  };

  const title = `${occasion} Picks`;

  return (
    <section className="px-[21px] pt-[26px]">
      <div className="inline-block bg-white rounded-xl px-3 py-1">
        <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">{title}</h2>
      </div>
      {isLoading ? (
        <div className="no-scrollbar mt-[11px] flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="g-skeleton h-[96px] min-w-[88px] flex-shrink-0 rounded-[12px]" />
          ))}
        </div>
      ) : (
        <div className="no-scrollbar mt-[11px] flex gap-3 overflow-x-auto pb-2">
          {recommended.map((brand, index) => {
            const image = getImageUrl(brand);
            const discountNum = Number(brand.Discount ?? 0);

            return (
              <button
                key={`${brand.BrandId}-${index}`}
                onClick={() => void handleBrandClick(brand.BrandId)}
                disabled={loadingBrandId === brand.BrandId}
                className="flex h-[96px] min-w-[88px] flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-[12px] bg-white px-[10px] py-[12px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 relative"
              >
                {discountNum > 0 && (
                  <span className="absolute top-0.5 left-0.5 z-20 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#5A4BD1] px-1.5 py-0.5 text-[8px] font-bold text-white leading-none shadow-md pointer-events-none">
                    {discountNum}%
                  </span>
                )}
                {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
                  <img src={superCoinImg} alt="SuperCoin" className="absolute top-1.5 right-1.5 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
                )}
                <div className="grid h-[40px] w-[40px] place-items-center">
                  {loadingBrandId === brand.BrandId ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#6D28D9]" />
                  ) : image ? (
                    <img
                      src={image}
                      alt={brand.BrandName}
                      className="h-[40px] w-[40px] object-contain"
                    />
                  ) : (
                    <Store className="h-6 w-6 text-[#94a3b8]" strokeWidth={2} />
                  )}
                </div>
                <div className="mt-2 w-full">
                  <p className="line-clamp-2 text-[11px] font-medium leading-[1.1] text-[#101010]">
                    {brand.BrandName}
                  </p>
                  <p className="mt-1 truncate text-[9px] font-medium text-[#888888]">
                    {discountNum > 0 ? `${discountNum}% Cashback` : brand.Category || "Gift Voucher"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function OccasionPicksSections({
  onOpenBrand,
}: {
  onOpenBrand: (brandId: string) => Promise<void> | void;
}) {
  const { data: occasions = [] } = useOccasions();

  // Pinned campaigns render first (current campaign season); everything else
  // stays alphabetical below them. New occasions still appear automatically.
  const OCCASION_PRIORITY = ["Rakhi"];

  const orderedOccasions = useMemo(() => {
    const pinned = OCCASION_PRIORITY.filter((p) => occasions.includes(p));
    const rest = occasions
      .filter((o) => !OCCASION_PRIORITY.includes(o))
      .sort((a, b) => a.localeCompare(b));
    return [...pinned, ...rest];
  }, [occasions]);

  if (!orderedOccasions.length) return null;

  return (
    <>
      {orderedOccasions.map((occasion) => (
        <OccasionPicksSection key={occasion} occasion={occasion} onOpenBrand={onOpenBrand} />
      ))}
    </>
  );
}

function TopBrandsGrid({
  onOpenBrand,
}: {
  onOpenBrand: (brandId: string) => Promise<void> | void;
}) {
  const [topBrands, setTopBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [loadingBrandId, setLoadingBrandId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTopBrands = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const response = await fetchTopBrands();

        if (isMounted) {
          setTopBrands(response);
        }
      } catch (error) {
        console.error("Failed to fetch top brands:", error);
        if (isMounted) {
          setHasError(true);
          setTopBrands([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTopBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  const midPoint = Math.ceil(topBrands.length / 2);
  const firstRowBrands = topBrands.slice(0, midPoint);
  const secondRowBrands = topBrands.slice(midPoint);
  const topRowItems =
    firstRowBrands.length > 0 ? [...firstRowBrands, ...firstRowBrands] : [];
  const bottomRowItems =
    secondRowBrands.length > 0 ? [...secondRowBrands, ...secondRowBrands] : [...firstRowBrands, ...firstRowBrands];

  const handleTopBrandBuy = async (brandId: string) => {
    try {
      setLoadingBrandId(brandId);
      await onOpenBrand(brandId);
    } finally {
      setLoadingBrandId(null);
    }
  };

  const renderBrandCard = (brand: Brand, index: number) => {
    const image = getImageUrl(brand);
    const discountNum = Number(brand.Discount ?? 0);

    return (
      <button
        key={`${brand.BrandId}-${index}`}
        onClick={() => void handleTopBrandBuy(brand.BrandId)}
        disabled={loadingBrandId === brand.BrandId}
        className="flex h-[96px] min-w-[88px] flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-[12px] bg-white px-[10px] py-[12px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 relative"
      >
        {discountNum > 0 && (
          <span className="absolute top-0.5 left-0.5 z-20 rounded-full bg-gradient-to-r from-[#6C5CE7] to-[#5A4BD1] px-1.5 py-0.5 text-[8px] font-bold text-white leading-none shadow-md pointer-events-none">
            {discountNum}%
          </span>
        )}
        {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
          <img src={superCoinImg} alt="SuperCoin" className="absolute top-1.5 right-1.5 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
        )}
        <div className="grid h-[40px] w-[40px] place-items-center">
          {loadingBrandId === brand.BrandId ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#6D28D9]" />
          ) : image ? (
            <img
              src={image}
              alt={brand.BrandName}
              className="h-[40px] w-[40px] object-contain"
            />
          ) : (
            <Store className="h-6 w-6 text-[#94a3b8]" strokeWidth={2} />
          )}
        </div>
        <div className="mt-2 w-full">
          <p className="line-clamp-2 text-[11px] font-medium leading-[1.1] text-[#101010]">
            {brand.BrandName}
          </p>
          <p className="mt-1 truncate text-[9px] font-medium text-[#888888]">
            {discountNum > 0 ? `${discountNum}% Cashback` : brand.Category || "Gift Voucher"}
          </p>
        </div>
      </button>
    );
  };

  return (
    <section className="px-[21px] pt-[26px]">
      <div className="inline-block bg-white rounded-xl px-3 py-1">
        <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">Top Brands</h2>
      </div>
      {isLoading ? (
        <div className="no-scrollbar mt-[11px] flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="g-skeleton h-[96px] min-w-[88px] flex-shrink-0 rounded-[12px]"
            />
          ))}
        </div>
      ) : hasError ? (
        <div className="mt-[11px] rounded-[12px] bg-white px-4 py-5 shadow-[0_4px_14px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-center gap-2 text-[#b42318]">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[13px] font-semibold">Unable to load top brands right now.</p>
          </div>
          <p className="mt-1 text-center text-[11px] text-[#667085]">
            Please try again in a moment.
          </p>
        </div>
      ) : topBrands.length === 0 ? (
        <div className="mt-[11px] rounded-[12px] bg-[#f5f5f5] px-4 py-4 text-center text-[12px] text-[#888888]">
          No top brands available right now.
        </div>
      ) : (
        <div className="marquee-mask mt-[11px] overflow-hidden">
          <div
            className="flex w-max gap-3 pb-3 anim-marquee-ltr"
            style={{ animationDuration: "200s" }}
          >
            {topRowItems.map(renderBrandCard)}
          </div>
          <div
            className="mt-3 flex w-max gap-3 anim-marquee-rtl"
            style={{ animationDuration: "220s" }}
          >
            {bottomRowItems.map(renderBrandCard)}
          </div>
        </div>
      )}
    </section>
  );
}

function RecentlyUsed({ onBuy }: { onBuy?: (brandId: string) => void }) {
  const [items, setItems] = useState<BrandItem[]>([]);
  const { user, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (!user?.clientId) return;
    (async () => {
      try {
        const res = await brandApi.post("/v1/neworders", { clientId: user.clientId, timeline: 12 });
        const orders: any[] = Array.isArray(res?.data?.orders) ? res.data.orders : [];
        const paid = orders
          .filter((o: any) => o.status?.toUpperCase() === "PAID")
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const seen = new Set<string>();
        const unique: BrandItem[] = [];
        for (const order of paid) {
          const item = order.items?.[0];
          const meta = item?.meta || item || {};
          const name = meta.brand_name || meta.brandName || meta.name;
          const brandId = meta.brandId || meta.brand_id || item.brandId || item.brand_id;
          if (name && !seen.has(name)) {
            seen.add(name);
            const image = getImageUrl(meta) || undefined;
            unique.push({ name, image, brandId });
            if (unique.length >= 6) break;
          }
        }
        setItems(unique);
      } catch {
        setItems([]);
      }
    })();
  }, [user?.clientId]);

  if (!items.length) return null;

  return (
    <section className="px-[21px] pt-[27px]">
      <div className="inline-block bg-white rounded-xl px-3 py-1">
        <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">Recently Used</h2>
      </div>
      <div className="no-scrollbar mt-[12px] flex snap-x gap-3 overflow-x-auto scroll-smooth">
        {items.map((item) => (
          <article key={item.name} className="w-[120px] min-w-[120px] h-[80px] snap-start flex-shrink-0 rounded-[8px] bg-white"
            style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.08)', padding: 8, position: 'relative' }}>
            <div className="flex items-start gap-2" style={{ height: 32 }}>
              <div className="flex-shrink-0" style={{ width: 40, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={item.image || "/brand-placeholder.png"} alt={item.name} style={{ width: 34, height: 28, objectFit: 'contain' }} />
              </div>
              <div className="min-w-0" style={{ flex: 1 }}>
                <span className="text-[12px] font-semibold text-[#111827] truncate block">{item.name}</span>
              </div>
            </div>
            <div style={{ height: 1, background: '#E5E7EB', marginTop: 6, marginBottom: 6 }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={() => item.brandId && onBuy?.(item.brandId)}
                style={{ background: 'linear-gradient(90deg,#7C3AED,#3B82F6)', color: 'white', padding: '6px 10px', borderRadius: 18, fontSize: 11, fontWeight: 600 }}
              >
                Buy Again
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BottomNav() {
  const [location, setLocation] = useLocation();
  const items = [
    { label: "Home", Icon: HomeIcon, href: "/" },
    { label: "Categories", Icon: Grid2X2, href: "/categories" },
    { label: "Brand", Icon: Store, href: "/brands" },
    { label: "Cart", Icon: ShoppingCart, href: "/cart" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-[63px] w-full bg-white/82 shadow-[0_-8px_18px_rgba(31,40,68,0.08)] backdrop-blur-[16px]">
      <div className="grid h-full grid-cols-4 px-[16px]">
        {items.map(({ label, Icon, href }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <button key={label} onClick={() => setLocation(href)} className="flex flex-col items-center justify-center gap-[3px] active:scale-95">
              <Icon className="h-[20px] w-[20px]" strokeWidth={2.4} color={active ? "#10aeec" : "#092f82"} fill={label === "Cart" ? (active ? "#10aeec" : "#092f82") : "none"} />
              <span className={`text-[7px] font-medium leading-none ${active ? "text-[#10aeec]" : "text-[#092f82]"}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function MobileHomeScreen() {
  const { toast } = useToast();
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);
  const [sheetInitialAmount, setSheetInitialAmount] = useState<number | undefined>(
    undefined
  );
  const [topBrandName, setTopBrandName] = useState("");
  const [topBrandVouchers, setTopBrandVouchers] = useState<TopBrandVoucher[]>([]);
  const [topBrandModalOpen, setTopBrandModalOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [topBrandLoading, setTopBrandLoading] = useState(false);
  const [topBrandError, setTopBrandError] = useState<string | null>(null);
  const [activeTopBrandId, setActiveTopBrandId] = useState<string | null>(null);
  const [superCoinsModalOpen, setSuperCoinsModalOpen] = useState(false);

  const [topBrandsFromApi, setTopBrandsFromApi] = useState<Brand[]>([]);

  useEffect(() => {
    fetchTopBrands().then(setTopBrandsFromApi).catch(() => {});
  }, []);

  const recentlyBoughtBrands: MatchedBrand[] = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const cartNormMap = new Map<string, CartBrandEntry>();
    for (const entry of cartBrandNames) {
      cartNormMap.set(normalize(entry.displayName), entry);
    }

    return topBrandsFromApi
      .filter((b) => {
        const brandNorm = normalize(b.BrandName);
        for (const [cartNorm] of cartNormMap) {
          if (
            brandNorm === cartNorm ||
            brandNorm.includes(cartNorm) ||
            cartNorm.includes(brandNorm)
          ) {
            return true;
          }
        }
        return false;
      })
      .map((b) => {
        const brandNorm = normalize(b.BrandName);
        for (const [cartNorm, entry] of cartNormMap) {
          if (
            brandNorm === cartNorm ||
            brandNorm.includes(cartNorm) ||
            cartNorm.includes(brandNorm)
          ) {
            return { ...b, cartMeta: entry };
          }
        }
        return null;
      })
      .filter((b): b is MatchedBrand => b !== null)
      .slice(0, 10);
  }, [topBrandsFromApi]);

  const openStandardPaymentSheet = (brandId: string) => {
    setSheetBrandId(brandId);
    setSheetInitialAmount(undefined);
    setBuySheetOpen(true);
  };

  const openTopBrandModal = async (brandId: string) => {
    setActiveTopBrandId(brandId);
    setTopBrandError(null);
    setTopBrandVouchers([]);
    setTopBrandName("");
    setTopBrandModalOpen(true);
    setTopBrandLoading(true);

    try {
      const vouchers = await fetchBrandVoucherList(brandId);
      setTopBrandVouchers(vouchers);
      setTopBrandName(vouchers[0]?.brandName || "Brand Vouchers");
    } catch (error: any) {
      console.error("Failed to fetch brand voucher details:", error);
      setTopBrandError(error?.message || "Please try again.");
      setTopBrandVouchers([]);
      setTopBrandName("");
    } finally {
      setTopBrandLoading(false);
    }
  };

  const retryTopBrandModal = async () => {
    if (!activeTopBrandId) return;
    await openTopBrandModal(activeTopBrandId);
  };

  const handleTopBrandVoucherSelect = (voucher: TopBrandVoucher) => {
    setSheetBrandId(voucher.brandId);
    const voucherAmount =
      voucher.minPrice > 0
        ? voucher.minPrice
        : voucher.maxPrice > 0
          ? voucher.maxPrice
          : undefined;
    setSheetInitialAmount(voucherAmount);
    setBuySheetOpen(true);
  };

  const openSuperCoinsModal = () => {
    if (SUPERCOIN_CONVERSION_PAUSED) {
      toast({
        title: SUPERCOIN_PAUSED_MESSAGE,
        variant: "destructive",
      });
      return;
    }
    // Routes into the normal purchase sheet with Flipkart's B2C card
    // pre-selected -- same flow as handleTopBrandVoucherSelect below, which
    // already adds to cart and navigates to /cart, where the real
    // cashback-vs-SuperCoins choice takes over. Replaces the old
    // burn-and-order/SuperCoinsModal path (kept dormant, not removed).
    setSheetBrandId(FLIPKART_B2C_BRAND_ID);
    setSheetInitialAmount(undefined);
    setBuySheetOpen(true);
  };

  // (feedback auto-trigger removed — feedback is only reachable via the floating button)

  return (
    <>
      <Header />
      <main className="min-h-screen w-full overflow-x-hidden pb-[84px] font-body text-[#101010] md:hidden relative">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${homebackImg})` }}
        />
        <div className="fixed inset-0 z-[1] bg-black/10 pointer-events-none" />
        <div className="relative z-10">
        <div className="relative overflow-visible pb-[70px]">
          <HomeHeader onSuperCoinClick={openSuperCoinsModal} />
          <BalanceCard />
        </div>
      <ActionGrid onBuyVoucher={() => setCategoriesOpen(true)} onSuperCoinClick={openSuperCoinsModal} />
      <SearchSection onBrandSelect={openStandardPaymentSheet} />
      <PromoCard />
      <RecommendedList
        onBuy={(id) => {
          openStandardPaymentSheet(id);
        }}
      />
      <RakhiBanner />
      <OccasionPicksSections
        onOpenBrand={openTopBrandModal}
      />
      {/* Rakhi Special Picks (WhatsHotSection) hidden per requirement — code kept for later
      <WhatsHotSection brands={recentlyBoughtBrands} onOpenBrand={openTopBrandModal} />
      */}
      <TopBrandsGrid
        onOpenBrand={openTopBrandModal}
      />
      <RecentlyUsed onBuy={openStandardPaymentSheet} />

      {/* CERTIFICATION LOGO */}
      <section className="px-[21px] pt-[27px] pb-[10px]">
        <div className="flex items-center justify-center">
          <img src={certfLogo} alt="Certifications" className="h-10 w-auto object-contain" />
        </div>
      </section>

      <CategoriesBottomSheet open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      <SuperCoinsBrandModal
        open={superCoinsModalOpen}
        brandId={SUPERCOIN_FEATURED_BRAND_ID}
        onClose={() => setSuperCoinsModalOpen(false)}
      />
      <BrandVoucherModal
        open={topBrandModalOpen}
        vouchers={topBrandVouchers}
        brandName={topBrandName}
        loading={topBrandLoading}
        error={topBrandError}
        onClose={() => {
          setTopBrandModalOpen(false);
          setTopBrandLoading(false);
          setTopBrandError(null);
          setActiveTopBrandId(null);
          setTopBrandVouchers([]);
          setTopBrandName("");
        }}
        onRetry={retryTopBrandModal}
        onVoucherSelect={handleTopBrandVoucherSelect}
      />
      <PaymentDetailsSheet
        brandId={sheetBrandId}
        open={buySheetOpen}
        initialAmount={sheetInitialAmount}
        onClose={() => {
          setBuySheetOpen(false);
          setSheetInitialAmount(undefined);
        }}
      />
      <FeedbackFloatingButton onClick={() => setFeedbackOpen(true)} />
      <FeedbackForm open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <BottomNav />
        </div>
      </main>
    </>
  );
}

export default function Home() {
  return (
    <>
      <MobileHomeScreen />
      <div className="hidden md:block">
        <Hero />
      </div>
    </>
  );
}
