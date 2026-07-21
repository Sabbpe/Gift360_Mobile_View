import { Bell, Eye, EyeOff, Gift, Send, ScanLine, UserPlus, User } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import InstantGiftingBanner from "@/components/InstantGiftingBanner";
import { useAuthContext } from "@/contexts/AuthContext";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { useBrands } from "@/hooks/useBrands";
import { useBrandNames } from "@/hooks/useBrandNames";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import type { Brand } from "@/types/brand";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";

const FALLBACK = FALLBACK_IMAGE;

const S = {
  purpleHeader: {
    position: "relative" as const, top: 0, left: 0, right: 0, height: 266.615,
    background: "linear-gradient(108.05deg, #3C3381 11.87%, #6C5CE7 99.85%)",
    borderBottomLeftRadius: 50, borderBottomRightRadius: 50, overflow: "hidden" as const,
  },
  glassCard: {
    position: "absolute" as const,
    top: 110.5,
    left: "50%",
    transform: "translateX(-50%)",
    width: 330,
    height: 130,
    borderRadius: 10,
    background: "rgba(225, 225, 225, 0.3)",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0px 10px 20px rgba(0,0,0,0.25)",
    overflow: "visible" as const,
    padding: 16,
  },
  primarySoft: { background: "#F5F6FA", boxShadow: "0px 4px 10px rgba(0,0,0,0.1)", width: 64, height: 64, borderRadius: 12, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const },
};

function getBrandImg(b: any): string | null {
  return getImageUrl(b) || null;
}

export default function Hero() {
  const [showBalance, setShowBalance] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuthContext();
  const { data: walletData } = useFetchWallet(user?.clientId);
  const { data: brands = [] } = useBrands();
  const { data: brandNames = [] } = useBrandNames();
  const walletBalance = walletData?.totalBalance ?? 0;
  const firstName = user?.name?.split(" ")[0] || "there";

  const recommended = useMemo(() =>
    [...(brands as Brand[])]
      .filter(b => parseFloat(b.Discount || "0") > 0)
      .sort((a, b) => parseFloat(b.Discount || "0") - parseFloat(a.Discount || "0"))
      .slice(0, 6),
    [brands]
  );

  const topBrands = useMemo(() => (brands as Brand[]).slice(0, 14), [brands]);
  const recentlyUsed = useMemo(() => (brands as Brand[]).slice(0, 6), [brands]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (brandNames as any[]).filter((b: any) => (b.BrandName || "").toLowerCase().includes(q)).slice(0, 8);
  }, [brandNames, searchQuery]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(e.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative bg-background overflow-y-auto no-scrollbar pb-24" style={{ minHeight: "100%" }}>
      {/* Purple header — inline style, no Tailwind class */}
      <div style={S.purpleHeader} />

      {/* Positioned glass balance card with stacked background cards to match Figma */}
      <div style={{ position: "relative", height: 0 }} aria-hidden>
        <div style={{ position: "absolute", top: 120.5, left: "50%", transform: "translateX(-50%)", width: 330, height: 130, borderRadius: 10, background: "rgba(0,0,0,0.06)", opacity: 0.6 }} />
        <div style={{ position: "absolute", top: 130.5, left: "50%", transform: "translateX(-50%)", width: 330, height: 130, borderRadius: 10, background: "rgba(0,0,0,0.06)", opacity: 0.3 }} />
        <div style={S.glassCard}>
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.30, background: "radial-gradient(circle at 70% 80%, hsla(48,80%,75%,0.6), transparent 50%)" }} />
          <div className="relative">
            <p className="text-sm" style={{ color: "rgba(0,0,0,0.75)" }}>Gift360 Balance</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>
                ₹ {showBalance ? walletBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "•••••••"}
              </p>
              <button onClick={() => setShowBalance(s => !s)} style={{ color: "rgba(0,0,0,0.6)" }}>
                {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-2xl anim-bob inline-block">💰</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between px-6 pt-5 pb-6 anim-fade-up">
          <h1 className="text-3xl font-bold text-white">
            {isAuthenticated ? `Hi ${firstName}!` : "Hi there!"}
          </h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/notifications")}
              className="relative w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: "rgba(255,255,255,0.15)" }}>
              <Bell className="w-5 h-5 text-white" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-400" style={{ boxShadow: "0 0 0 2px hsl(252,80%,58%)" }} />
            </button>
            <button onClick={() => setLocation("/profile")}
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: "#FCD34D" }}>
              <User className="w-5 h-5 text-orange-900" />
            </button>
          </div>
        </div>

        {/* (Balance card removed from here; rendered after header to match exact positioning) */}

        {/* Main content container (starts at exact margin-top and uses spacing system) */}
        <div style={{ marginTop: 296, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions — inline bg-primary-soft */}
          <div className="grid grid-cols-4 gap-2 px-6 mt-8 anim-fade-up delay-200">
          {[
            { Icon: Gift,     label: "Buy Voucher",    href: "/brands" },
            { Icon: Send,     label: "Near by stores", href: "/nearby" },
            { Icon: ScanLine, label: "Redeem",         href: "/orders" },
            { Icon: UserPlus, label: "Partner with Us",href: "/distributor" },
          ].map(({ Icon, label, href }) => (
            <button key={label} onClick={() => setLocation(href)}
              className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
              <div style={S.primarySoft} className="hover:scale-105 transition-transform">
                <Icon className="w-6 h-6" style={{ color: "hsl(252,80%,58%)" }} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] text-foreground text-center font-medium leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div className="px-6 mt-5 anim-fade-up delay-300 relative">
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none z-10 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <Input ref={searchInputRef} value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => { if (searchQuery) setShowSuggestions(true); }}
              onKeyDown={e => { if (e.key === "Enter" && searchQuery.trim()) { setLocation(`/brands?search=${encodeURIComponent(searchQuery)}`); setShowSuggestions(false); }}}
              placeholder="Search brands, vouchers..."
              className="pl-10 h-11 rounded-2xl font-medium"
              style={{ background: "hsl(var(--card))", border: "1.5px solid hsl(var(--border))" }} />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl overflow-y-auto z-50"
                style={{ maxHeight: 220, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                {filteredSuggestions.map((b: any, i: number) => (
                  <button key={i} onClick={() => {
                    const brandId = b.BrandId || b.brandId;
                    if (brandId) {
                      setSheetBrandId(brandId);
                      setSheetOpen(true);
                    }
                    setSearchQuery("");
                    setShowSuggestions(false);
                  }}
                    className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-0 flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{b.BrandName || b.brandName}</span>
                    {b.Category && <span className="text-xs text-muted-foreground">{b.Category}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="anim-fade-up delay-300">
          <InstantGiftingBanner onExplore={() => setLocation('/brands')} />
        </div>

        {/* Recommended */}
        <div className="px-6 mt-6 anim-fade-up delay-400">
          <h3 className="text-lg font-bold text-foreground mb-3">Recommended</h3>
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-1">
            {recommended.map((brand: Brand) => {
              const img = getBrandImg(brand);
              return (
                <button key={brand.BrandId}
                  onClick={() => setLocation(`/brands/${brand.BrandId}`)}
                  className="text-left bg-card p-3 flex items-center gap-3 active:scale-[0.98] transition-transform"
                  style={{ width: 140, borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}>
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center p-1.5">
                    {img ? <img src={img} alt={brand.BrandName} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                      : <div className="w-full h-full bg-accent rounded-lg" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{brand.BrandName}</p>
                    <p className="text-[11px] text-muted-foreground">{brand.Category || "E-Gift Card"}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-bold">₹{brand.MinPrice || (brand as any).minPrice || "50"}</span>
                      <span className="px-3 py-1 rounded-full text-white text-[11px] font-semibold" style={{ background: "hsl(252,80%,58%)" }}>Buy</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Top Brands — 3D dual marquee */}
        <div className="mt-8 anim-fade-up delay-500">
          <div className="px-6 flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold title-magic">Top Brands</h3>
              <span className="text-base anim-twinkle" style={{ animationDelay: "0s" }}>✨</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "hsl(252,80%,58%,0.7)" }}>Trending</span>
          </div>

          <div className="relative brand-stage py-3 overflow-hidden">
            <div className="absolute w-32 h-32 rounded-full blur-3xl pointer-events-none anim-orb"
              style={{ background: "hsl(252 80% 64% / 0.35)", top: "-20px", left: "10%" }} />
            <div className="absolute w-28 h-28 rounded-full blur-3xl pointer-events-none anim-orb"
              style={{ background: "hsl(280 90% 70% / 0.3)", top: "30px", right: "15%", animationDelay: "2s" }} />
            <div className="absolute w-24 h-24 rounded-full blur-3xl pointer-events-none anim-orb"
              style={{ background: "hsl(48 95% 65% / 0.25)", bottom: "0px", left: "45%", animationDelay: "4s" }} />
            {[{ top:"10%",left:"8%",delay:"0s" },{ top:"60%",left:"22%",delay:"0.8s" },{ top:"20%",left:"55%",delay:"1.4s" },{ top:"75%",left:"70%",delay:"0.4s" },{ top:"35%",left:"88%",delay:"2s" }].map((s, i) => (
              <span key={i} className="absolute anim-twinkle pointer-events-none text-xs" style={{ top: s.top, left: s.left, animationDelay: s.delay, color: "hsl(252,80%,58%)" }}>✦</span>
            ))}

            {/* Row 1 RTL */}
            <div className="marquee-mask brand-track-3d">
              <div className="flex gap-3 anim-marquee-rtl w-max px-2">
                {[...topBrands, ...topBrands].map((b: Brand, i) => {
                  const img = getBrandImg(b);
                  return (
                    <button key={`r1-${i}`} onClick={() => setLocation(`/brands/${b.BrandId}`)}
                      className="brand-tile group relative shrink-0" style={{ animationDelay: `${(i % 8) * 0.25}s` }}>
                      <div className="absolute -inset-[2px] rounded-2xl brand-ring opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]" />
                      <div className="relative w-[88px] bg-card rounded-2xl p-2.5 flex flex-col items-center gap-1.5" style={{ boxShadow: "0 4px 16px -6px rgba(0,0,0,0.12)" }}>
                        <div className="w-14 h-14 rounded-xl bg-card flex items-center justify-center p-1.5">
                          {img ? <img src={img} alt={b.BrandName} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                            : <div className="w-full h-full bg-accent rounded-xl" />}
                        </div>
                        <p className="text-[10px] font-semibold text-foreground text-center truncate w-full">{b.BrandName?.slice(0, 12)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 2 LTR */}
            <div className="marquee-mask brand-track-3d mt-3">
              <div className="flex gap-3 anim-marquee-ltr w-max px-2">
                {[...[...topBrands].reverse(), ...[...topBrands].reverse()].map((b: Brand, i) => {
                  const img = getBrandImg(b);
                  return (
                    <button key={`r2-${i}`} onClick={() => setLocation(`/brands/${b.BrandId}`)}
                      className="brand-tile group relative shrink-0" style={{ animationDelay: `${(i % 8) * 0.3 + 0.5}s` }}>
                      <div className="absolute -inset-[2px] rounded-2xl brand-ring opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]" />
                      <div className="relative w-[78px] bg-card rounded-2xl p-2 flex flex-col items-center gap-1" style={{ boxShadow: "0 4px 16px -6px rgba(0,0,0,0.12)" }}>
                        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center p-1">
                          {img ? <img src={img} alt={b.BrandName} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                            : <div className="w-full h-full bg-accent rounded-xl" />}
                        </div>
                        <p className="text-[9px] font-semibold text-foreground text-center truncate w-full">{b.BrandName?.slice(0, 10)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        </div>

        {/* Recently Used */}
        <div className="px-6 mt-6 anim-fade-up delay-500">
          <h3 className="text-lg font-bold text-foreground mb-3">Recently Used</h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-1">
            {recentlyUsed.map((b: Brand, i: number) => {
              const img = getBrandImg(b);
              return (
                <button key={i} onClick={() => setLocation(`/brands/${b.BrandId}`)}
                  className="w-12 h-12 rounded-full bg-card flex items-center justify-center p-1.5 shrink-0 active:scale-95 transition-transform"
                  style={{ boxShadow: "0 4px 16px -6px rgba(0,0,0,0.12)" }}>
                  {img ? <img src={img} alt={b.BrandName} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
                    : <div className="w-full h-full bg-accent rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <PaymentDetailsSheet
        brandId={sheetBrandId}
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setSheetBrandId(null);
        }}
      />
    </div>
  );
}
