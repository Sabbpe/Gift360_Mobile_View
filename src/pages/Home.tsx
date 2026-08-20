import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
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
import { useBrands } from "@/hooks/useBrands";
import { useBrandNames } from "@/hooks/useBrandNames";
import type { Brand } from "@/types/brand";
import gWord from "@/assets/G word.png";
import giftcardbg from "@/assets/giftcardbg.png";
import rakhiBannerImg from "@/assets/rakhibanner.png";
import giftLogo from "@/assets/Gift.png";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
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
          <SuperCoinHeaderIcon onClick={onSuperCoinClick} />
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
    { label: "Near by stores", Icon: Send, href: "/nearby" },
    { label: "Orders", Icon: Package, href: "/orders" },
    { label: "Partner with Us", Icon: UserRoundPlus, href: "/distributor" },
  ];

  return (
    <section className="px-[21px] pt-[18px]">
      <div className="grid grid-cols-4 gap-[17px] pt-[18px]">
        {actions.map(({ label, Icon, href, onClick }) => (
          <button key={label} onClick={onClick || (() => setLocation(href))} className="flex flex-col items-center active:scale-95">
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
  const { data: brands = [] } = useBrands();
  const [, setLocation] = useLocation();

  const recommended = useMemo(
    () =>
      [...(brands as Brand[])]
        .filter((b) => parseFloat(b.Discount || "0") > 0)
        .sort(
          (a, b) => parseFloat(b.Discount || "0") - parseFloat(a.Discount || "0")
        )
        .slice(0, 6),
    [brands]
  );

  return (
    <section className="pt-[27px]">
      <h2 className="px-[21px] text-[17px] font-bold leading-none tracking-[-0.02em] text-[#101010]">Rakhi Recommendations</h2>
      <div className="no-scrollbar mt-[11px] flex snap-x gap-3 overflow-x-auto scroll-smooth px-[21px] pb-[3px]">
        {recommended.map((brand) => {
          const imageSrc = getRecommendedBrandImage(brand);
          const priceValue = brand.MinPrice || brand.MaxPrice || 0;

          return (
            <article
              key={brand.BrandId}
              className="w-[120px] min-w-[120px] h-[80px] snap-start flex-shrink-0 rounded-[8px] bg-white"
              style={{ boxShadow: '0 4px 10px rgba(0,0,0,0.08)', padding: 8, position: 'relative' }}
            >
              <div className="flex items-start gap-2" style={{ height: 32 }}>
                <div className="flex-shrink-0" style={{ width: 40, height: 32, borderRadius: 8, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {imageSrc ? (
                    <img src={imageSrc} alt={brand.BrandName} style={{ width: 34, height: 28, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: 34, height: 28 }} />
                  )}
                </div>

                <div className="min-w-0" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span className="text-[12px] font-semibold text-[#111827] truncate">{brand.BrandName}</span>
                    <span className="text-[10px] text-[#6B7280] truncate">{priceValue > 0 ? `₹${priceValue.toLocaleString()} Voucher` : 'Voucher'}</span>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: '#E5E7EB', marginTop: 6, marginBottom: 6 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="text-[12px] font-bold text-[#111827]">{priceValue > 0 ? `₹${priceValue.toLocaleString()}` : '-'}</div>
                <button
                  onClick={() => { if (onBuy) onBuy(brand.BrandId); else setLocation(`/brand/${brand.BrandId}`); }}
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

  const firstRowBrands = topBrands.filter((_, index) => index % 2 === 0);
  const secondRowBrands = topBrands.filter((_, index) => index % 2 === 1);
  const topRowItems =
    firstRowBrands.length > 0 ? [...firstRowBrands, ...firstRowBrands] : [];
  const bottomRowItemsSource =
    secondRowBrands.length > 0 ? secondRowBrands : firstRowBrands;
  const bottomRowItems =
    bottomRowItemsSource.length > 0
      ? [...bottomRowItemsSource, ...bottomRowItemsSource]
      : [];

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
    const meta = brand.Discount
      ? `${brand.Discount}% Cashback`
      : brand.Category || "Gift Voucher";

    return (
      <button
        key={`${brand.BrandId}-${index}`}
        onClick={() => void handleTopBrandBuy(brand.BrandId)}
        disabled={loadingBrandId === brand.BrandId}
        className="flex h-[96px] min-w-[88px] flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-[12px] bg-white px-[10px] py-[12px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-80 relative"
      >
        {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
          <img src={superCoinImg} alt="SuperCoin" className="absolute top-1.5 right-1.5 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
        )}
        <div className="grid h-[40px] w-[40px] place-items-center">
          {loadingBrandId === brand.BrandId ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#7C3AED]" />
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
            {meta}
          </p>
        </div>
      </button>
    );
  };

  return (
    <section className="px-[21px] pt-[26px]">
      <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-[#101010]">Top Brands</h2>
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
      <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-[#101010]">Recently Used</h2>
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

    return cartBrandNames
      .map((entry) => {
        const cartNorm = normalize(entry.displayName);
        const matched = topBrandsFromApi.find((b) => {
          const brandNorm = normalize(b.BrandName);
          return (
            brandNorm === cartNorm ||
            brandNorm.includes(cartNorm) ||
            cartNorm.includes(brandNorm)
          );
        });
        if (!matched) return null;
        return { ...matched, cartMeta: entry };
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
    setSuperCoinsModalOpen(true);
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
      <WhatsHotSection brands={recentlyBoughtBrands} onOpenBrand={openTopBrandModal} />
      <TopBrandsGrid
        onOpenBrand={openTopBrandModal}
      />
      <RecentlyUsed onBuy={openStandardPaymentSheet} />
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
