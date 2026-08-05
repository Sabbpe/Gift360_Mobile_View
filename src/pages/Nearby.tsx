import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Store,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import { getUserLocation, reverseGeocode } from "@/utils/geolocation";
import { useNearbyBrands } from "@/hooks/useNearbyBrands";
import { getImageUrl } from "@/utils/imageUrl";
import type { NearbyBrand, NearbyBrandsRequest } from "@/types/store";

const CATEGORY_CHIPS = [
  "Entertainment",
  "Ecommerce",
  "Fashion & Lifestyle",
  "Food & Beverages",
  "Jewellery",
  "Gaming",
];

type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "confirming";

function LocationConfirmModal({
  address,
  onConfirm,
}: {
  address: string;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onConfirm}
      />
      <div className="relative w-full max-w-[342px] rounded-[32px] bg-white p-8 text-center shadow-[0_12px_24px_rgba(0,0,0,0.25)]">
        <button
          onClick={onConfirm}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] hover:bg-gray-200 transition-colors"
        >
          <XCircle className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-500" strokeWidth={2} />
        </div>
        <h2 className="text-[16px] font-bold text-[#171a24] mb-2">Confirm Your Location</h2>
        <p className="text-[13px] font-semibold text-[#171a24] bg-[#f6f7fb] rounded-xl px-4 py-3 mb-5">
          {address}
        </p>
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#6a53ff] px-5 py-3 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(106,83,255,0.3)] active:scale-[0.98] transition-all"
        >
          <CheckCircle className="h-4 w-4" />
          Confirm
        </button>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="px-4">
      <div className="rounded-[999px] bg-[linear-gradient(135deg,#d8d8ff_0%,#b9c7ff_30%,#e7d7ff_100%)] p-[1.5px] shadow-[0_10px_30px_rgba(73,84,177,0.08)]">
        <div className="flex h-12 items-center gap-2 rounded-[999px] bg-[#f9f9fd] px-4">
          <Search className="h-4 w-4 text-[#7f8699] shrink-0" strokeWidth={2.2} />
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search nearby brands..."
            className="h-full w-full bg-transparent text-[14px] font-medium text-[#151722] outline-none placeholder:text-[#9aa1b4]"
          />
        </div>
      </div>
    </div>
  );
}

function CategoryChips({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4">
      {CATEGORY_CHIPS.map((cat) => {
        const active = selected === cat;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`rounded-full px-[13px] py-[8px] text-[11px] font-semibold tracking-[-0.01em] transition-all active:scale-[0.98] ${
              active
                ? "bg-[#6a53ff] text-white shadow-[0_8px_18px_rgba(106,83,255,0.22)]"
                : "bg-[#eef0ff] text-[#404555]"
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

function NearbyBrandCard({
  brand,
  onBuy,
}: {
  brand: NearbyBrand;
  onBuy: (brandId: string) => void;
}) {
  const imgSrc = getImageUrl(brand.images) ?? getImageUrl(brand);
  const distance = brand.nearestDistanceKm != null
    ? brand.nearestDistanceKm < 1
      ? `${Math.round(brand.nearestDistanceKm * 1000)} m away`
      : `${brand.nearestDistanceKm.toFixed(1)} km away`
    : null;

  return (
    <article className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#f1f3fb]">
        {imgSrc ? (
          <img src={imgSrc} alt={brand.brandName} className="h-full w-full object-contain p-1" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#eef0ff_0%,#dde4ff_100%)] text-[12px] font-bold text-[#5f6380]">
            {brand.brandName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-[19px] text-[#171a24]">
          {brand.brandName}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-[#8b90a4]">{brand.category}</p>
        {distance && (
          <div className="mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#6a53ff] shrink-0" strokeWidth={2.2} />
            <span className="text-[11px] font-semibold text-[#6a53ff]">{distance}</span>
          </div>
        )}
        {(brand.minPrice > 0 || brand.maxPrice > 0) && (
          <p className="mt-0.5 text-[10px] text-[#9aa1b4]">
            ₹{brand.minPrice.toLocaleString("en-IN")}
            {brand.maxPrice > brand.minPrice && ` – ₹${brand.maxPrice.toLocaleString("en-IN")}`}
          </p>
        )}
      </div>

      <button
        onClick={() => onBuy(brand.brandId)}
        className="shrink-0 flex items-center gap-1 rounded-full bg-[#6a53ff] px-3 py-1.5 text-[11px] font-bold text-white shadow-[0_4px_12px_rgba(106,83,255,0.3)] active:scale-95 transition-all"
      >
        <ShoppingBag className="h-3 w-3" />
        Buy
      </button>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="h-16 w-16 shrink-0 rounded-[14px] bg-[#eef0ff] animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 bg-[#eef0ff] rounded-full animate-pulse" />
        <div className="h-3 w-20 bg-[#f3f4f8] rounded-full animate-pulse" />
        <div className="h-3 w-16 bg-[#f3f4f8] rounded-full animate-pulse" />
      </div>
      <div className="h-8 w-14 rounded-full bg-[#eef0ff] animate-pulse" />
    </div>
  );
}

function LocationPrompt({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="mx-4 mt-6 rounded-[24px] bg-white p-8 text-center shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef0ff]">
        <Navigation className="h-8 w-8 text-[#6a53ff]" strokeWidth={2} />
      </div>
      <h3 className="text-[17px] font-bold text-[#171a24] mb-2">Enable Location</h3>
      <p className="text-[13px] text-[#8b90a4] mb-6 max-w-[240px] mx-auto leading-relaxed">
        We need your location to find gift voucher stores near you.
      </p>
      <button
        onClick={onRequest}
        className="inline-flex items-center gap-2 rounded-full bg-[#6a53ff] px-6 py-3 text-[14px] font-bold text-white shadow-[0_8px_18px_rgba(106,83,255,0.3)] active:scale-95 transition-all"
      >
        <MapPin className="h-4 w-4" />
        Allow Location Access
      </button>
    </div>
  );
}

function LocationDenied() {
  return (
    <div className="mx-4 mt-6 rounded-[24px] bg-white p-8 text-center shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <AlertCircle className="h-8 w-8 text-red-400" strokeWidth={2} />
      </div>
      <h3 className="text-[17px] font-bold text-[#171a24] mb-2">Location Access Denied</h3>
      <p className="text-[13px] text-[#8b90a4] max-w-[260px] mx-auto leading-relaxed">
        Please enable location access in your browser settings to discover stores near you.
      </p>
    </div>
  );
}

function EmptyState({ category }: { category: string }) {
  return (
    <div className="mx-4 mt-6 rounded-[24px] bg-white p-8 text-center shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#eef0ff]">
        <Store className="h-8 w-8 text-[#6a53ff]" strokeWidth={1.8} />
      </div>
      <h3 className="text-[17px] font-bold text-[#171a24] mb-2">No Stores Found</h3>
      <p className="text-[13px] text-[#8b90a4] max-w-[240px] mx-auto leading-relaxed">
        No {category} stores found near your location. Try a different category.
      </p>
    </div>
  );
}

function MapCard({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const handleMapClick = () => {
    if (userLocation) {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${userLocation.lat},${userLocation.lng}`,
        "_blank"
      );
    }
  };

  return (
    <div className="px-4">
      <h2 className="mb-2 text-[16px] font-semibold tracking-[-0.02em] text-[#171a24]">
        Nearby Stores Map
      </h2>
      <div
        onClick={handleMapClick}
        className="relative h-[140px] overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#f2f5ff_0%,#e8ecff_46%,#dfe8ff_100%)] shadow-[0_12px_28px_rgba(42,52,102,0.10)] cursor-pointer hover:shadow-[0_12px_28px_rgba(42,52,102,0.18)] transition-shadow"
      >
        <div className="absolute inset-0 opacity-65">
          <div className="absolute left-0 top-1/2 h-px w-full bg-[#cfd6f3]" />
          <div className="absolute left-0 top-[30%] h-px w-full bg-[#d8def5]" />
          <div className="absolute left-0 top-[70%] h-px w-full bg-[#d8def5]" />
          <div className="absolute left-[20%] top-0 h-full w-px bg-[#d8def5]" />
          <div className="absolute left-[50%] top-0 h-full w-px bg-[#d8def5]" />
          <div className="absolute left-[80%] top-0 h-full w-px bg-[#d8def5]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(122,97,255,0.14),transparent_22%),radial-gradient(circle_at_72%_58%,rgba(72,173,255,0.12),transparent_22%)]" />
        {[
          { left: "22%", top: "30%" },
          { left: "52%", top: "55%" },
          { left: "75%", top: "35%" },
        ].map((point, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: point.left, top: point.top }}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6a53ff] text-white shadow-[0_6px_16px_rgba(106,83,255,0.32)]">
              <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
            </div>
          </div>
        ))}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-full bg-white/80 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold text-[#6a53ff] shadow-sm">
            Live location
          </span>
        </div>
      </div>
    </div>
  );
}

function NearbyStoresPage() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORY_CHIPS[0]);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyRequest, setNearbyRequest] = useState<NearbyBrandsRequest | null>(null);
  const [detectedAddress, setDetectedAddress] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [paymentSheetBrandId, setPaymentSheetBrandId] = useState<string | null>(null);

  const requestLocation = () => {
    setLocationStatus("requesting");
    getUserLocation().then(async (loc) => {
      if (loc) {
        setUserLocation(loc);
        setIsGeocoding(true);
        const result = await reverseGeocode(loc.lat, loc.lng);
        setIsGeocoding(false);
        if (result) {
          setDetectedAddress(result.displayName);
          setShowConfirmModal(true);
          setLocationStatus("confirming");
        } else {
          setLocationStatus("granted");
        }
      } else {
        setLocationStatus("denied");
      }
    });
  };

  const handleConfirmLocation = () => {
    setShowConfirmModal(false);
    setLocationStatus("granted");
  };

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    setNearbyRequest({
      lat: userLocation.lat,
      lng: userLocation.lng,
      category: selectedCategory,
    });
  }, [userLocation, selectedCategory]);

  const { data: nearbyBrandsData, isLoading, isError } = useNearbyBrands(
    nearbyRequest,
    locationStatus === "granted" && !!nearbyRequest
  );

  const brands: NearbyBrand[] = Array.isArray(nearbyBrandsData) ? nearbyBrandsData : [];

  const filteredBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) =>
        b.brandName.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [brands, query]);

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  const handleBuy = (brandId: string) => {
    setPaymentSheetBrandId(brandId);
    setPaymentSheetOpen(true);
  };

  const showLoading = locationStatus === "requesting" || isGeocoding || (locationStatus === "granted" && isLoading);

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-24">
      {showConfirmModal && (
        <LocationConfirmModal
          address={detectedAddress}
          onConfirm={handleConfirmLocation}
        />
      )}

      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#11131d] shadow-[0_8px_20px_rgba(33,38,61,0.08)] active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#11131d]">
              Offers Near You
            </h1>
            {locationStatus === "granted" && userLocation && (
              <p className="text-[11px] text-[#6a53ff] font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {detectedAddress ? detectedAddress.split(",")[0] : "Location active"}
              </p>
            )}
          </div>
        </div>
      </div>

      <SearchBar value={query} onChange={setQuery} />

      <div className="mt-4">
        <CategoryChips selected={selectedCategory} onSelect={handleCategorySelect} />
      </div>

      {locationStatus === "granted" && (
        <div className="mt-4">
          <MapCard userLocation={userLocation} />
        </div>
      )}

      <div className="mt-4">
        {locationStatus === "idle" || locationStatus === "requesting" || isGeocoding ? (
          <div className="mx-4 mt-6 rounded-[24px] bg-white p-8 text-center shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
            <Loader2 className="h-8 w-8 animate-spin text-[#6a53ff] mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-[#8b90a4]">
              {isGeocoding ? "Detecting your location..." : "Getting your location..."}
            </p>
          </div>
        ) : locationStatus === "denied" ? (
          <LocationDenied />
        ) : isLoading ? (
          <div className="space-y-3 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="mx-4 mt-2 rounded-[18px] bg-white px-4 py-4 text-[14px] font-medium text-[#6b7280] shadow-[0_12px_24px_rgba(36,43,77,0.08)] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            Unable to load nearby stores. Please try again.
          </div>
        ) : filteredBrands.length > 0 ? (
          <>
            <div className="px-4 pb-3">
              <p className="text-[13px] font-semibold text-[#8b90a4]">
                {filteredBrands.length} {selectedCategory} store{filteredBrands.length !== 1 ? "s" : ""} near you
              </p>
            </div>
            <div className="space-y-3 px-4">
              {filteredBrands.map((brand) => (
                <NearbyBrandCard key={brand.brandId} brand={brand} onBuy={handleBuy} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState category={selectedCategory} />
        )}
      </div>

      <MobileBottomNav />

      <PaymentDetailsSheet
        brandId={paymentSheetBrandId}
        open={paymentSheetOpen}
        onClose={() => setPaymentSheetOpen(false)}
      />
    </div>
  );
}

export default function Nearby() {
  return <NearbyStoresPage />;
}
