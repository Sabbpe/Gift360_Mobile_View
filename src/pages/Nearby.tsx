import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, ChevronRight, MapPin, Search, Star } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { getUserLocation } from "@/utils/geolocation";
import { useBrands } from "@/hooks/useBrands";
import { useNearbyStores } from "@/hooks/useNearbyStores";
import type { NearbyStore, NearbyStoreRequest } from "@/types/store";

const CATEGORY_CHIPS = [
  "Entertainment",
  "Ecommerce",
  "Fashion & Lifestyle",
  "Food & Beverages",
  "Jewellery",
  "Gaming",
];

type StoreCardData = {
  name: string;
  rating: number;
  image?: string;
  category: string;
  address: string;
  city: string;
};

function resolveBrandDetailImage(images: Record<string, string | undefined> | null | undefined) {
  if (!images) return undefined;
  return images.text || images.thumbnail || images.featured || images.mobile || images.base || images.small || images.raw || undefined;
}

const DEMO_STORES: StoreCardData[] = [
  {
    name: "Josalukkas",
    rating: 4.6,
    category: "Jewellery",
    address: "MG Road",
    city: "Bengaluru",
  },
  {
    name: "Reliance Digital",
    rating: 4.4,
    category: "Ecommerce",
    address: "Phoenix Marketcity",
    city: "Chennai",
  },
  {
    name: "PVR Cinemas",
    rating: 4.7,
    category: "Entertainment",
    address: "VR Mall",
    city: "Hyderabad",
  },
  {
    name: "Zara",
    rating: 4.5,
    category: "Fashion & Lifestyle",
    address: "Forum Mall",
    city: "Kolkata",
  },
  {
    name: "Domino's",
    rating: 4.3,
    category: "Food & Beverages",
    address: "Park Street",
    city: "Pune",
  },
  {
    name: "Play Arena",
    rating: 4.8,
    category: "Gaming",
    address: "HSR Layout",
    city: "Bengaluru",
  },
];

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="px-4">
      <div className="rounded-[999px] bg-[linear-gradient(135deg,#d8d8ff_0%,#b9c7ff_30%,#e7d7ff_100%)] p-[1.5px] shadow-[0_10px_30px_rgba(73,84,177,0.08)]">
        <div className="flex h-12 items-center gap-2 rounded-[999px] bg-[#f9f9fd] px-4">
          <Search className="h-4 w-4 text-[#7f8699]" strokeWidth={2.2} />
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search nearby gift stores..."
            className="h-full w-full bg-transparent text-[14px] font-medium text-[#151722] outline-none placeholder:text-[#9aa1b4]"
          />
        </div>
      </div>
    </div>
  );
}

function CategoryChips({
  selectedCategory,
  onSelect,
}: {
  selectedCategory: string | null;
  onSelect: (category: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4">
      {CATEGORY_CHIPS.map((category) => {
        const active = selectedCategory === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            className={`rounded-full px-[13px] py-[8px] text-[11px] font-semibold tracking-[-0.01em] transition-transform active:scale-[0.98] ${
              active
                ? "bg-[#6a53ff] text-white shadow-[0_8px_18px_rgba(106,83,255,0.22)]"
                : "bg-[#eef0ff] text-[#404555]"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

function MapCard() {
  return (
    <div className="px-4">
      <h2 className="mb-2 text-[16px] font-semibold tracking-[-0.02em] text-[#171a24]">
        Near by Stores Map
      </h2>
      <div className="relative h-[168px] overflow-hidden rounded-[18px] bg-[linear-gradient(180deg,#f2f5ff_0%,#e8ecff_46%,#dfe8ff_100%)] shadow-[0_12px_28px_rgba(42,52,102,0.10)]">
        <div className="absolute inset-0 opacity-65">
          <div className="absolute left-0 top-1/2 h-px w-full bg-[#cfd6f3]" />
          <div className="absolute left-0 top-[26%] h-px w-full bg-[#d8def5]" />
          <div className="absolute left-0 top-[72%] h-px w-full bg-[#d8def5]" />
          <div className="absolute left-[18%] top-0 h-full w-px bg-[#d8def5]" />
          <div className="absolute left-[49%] top-0 h-full w-px bg-[#d8def5]" />
          <div className="absolute left-[77%] top-0 h-full w-px bg-[#d8def5]" />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(122,97,255,0.14),transparent_22%),radial-gradient(circle_at_72%_58%,rgba(72,173,255,0.12),transparent_22%),radial-gradient(circle_at_78%_18%,rgba(255,198,92,0.16),transparent_16%)]" />

        {[
          { left: "22%", top: "28%" },
          { left: "39%", top: "58%" },
          { left: "68%", top: "38%" },
        ].map((point, index) => (
          <div
            key={index}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: point.left, top: point.top }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6a53ff] text-white shadow-[0_10px_20px_rgba(106,83,255,0.24)]">
              <MapPin className="h-4 w-4" strokeWidth={2.4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: StoreCardData }) {
  const route = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${store.name}, ${store.address}, ${store.city}`)}`;

  return (
    <article className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-3 shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-[#f1f3fb]">
        {store.image ? (
          <img
            src={store.image}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#eef0ff_0%,#dde4ff_100%)] text-[10px] font-semibold text-[#5f6380]">
            {store.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold leading-[19px] text-[#171a24]">
          {store.name}
        </p>
        <div className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[#646b7d]">
          <Star className="h-3.5 w-3.5 fill-[#ffb545] text-[#ffb545]" strokeWidth={1.8} />
          <span>{store.rating.toFixed(1)}</span>
        </div>
        <p className="mt-1 truncate text-[11px] font-medium text-[#8b90a4]">
          {store.address}, {store.city}
        </p>
        <a
          href={route}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#6a53ff]"
        >
          Get Directions <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </article>
  );
}

function StoreList({ stores }: { stores: StoreCardData[] }) {
  return (
    <div className="space-y-3 px-4 pb-24">
      {stores.map((store) => (
        <StoreCard key={`${store.name}-${store.city}`} store={store} />
      ))}
    </div>
  );
}

function NearbyStoresPage() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { data: brands = [] } = useBrands();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyRequest, setNearbyRequest] = useState<NearbyStoreRequest | null>(null);

  const brandCodeParam = useMemo(() => new URLSearchParams(search).get("brandCode"), [search]);
  const defaultBrandCode = brandCodeParam || (brands as any[])[0]?.BrandCode || (brands as any[])[0]?.brandCode || null;
  const defaultBrandId = useMemo(() => {
    const matchedBrand = (brands as any[]).find(
      (brand) => brand.BrandCode === defaultBrandCode || brand.brandCode === defaultBrandCode
    );
    return matchedBrand?.BrandId || matchedBrand?.brandId || null;
  }, [brands, defaultBrandCode]);

  const { data: brandDetails } = useBrandDetails(defaultBrandId || "", {
    enabled: Boolean(defaultBrandId),
  });

  useEffect(() => {
    let mounted = true;

    getUserLocation().then((location) => {
      if (mounted && location) {
        setUserLocation(location);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userLocation || !defaultBrandCode) {
      return;
    }

    setNearbyRequest({
      lat: userLocation.lat,
      lng: userLocation.lng,
      brandCode: defaultBrandCode,
    });
  }, [defaultBrandCode, userLocation]);

  const { data: nearbyStoresData, isLoading } = useNearbyStores(nearbyRequest, Boolean(nearbyRequest));

  const apiStores = useMemo<StoreCardData[]>(() => {
    const nearbyStores: NearbyStore[] = Array.isArray(nearbyStoresData) ? nearbyStoresData : [];
    const brandImage = resolveBrandDetailImage(brandDetails?.Images);

    return nearbyStores.map((store, index) => ({
      name: store.address.split(",")[0] || `Nearby Store ${index + 1}`,
      rating: Math.max(4.1, 4.8 - index * 0.1),
      image: brandImage || store.image,
      category: selectedCategory || "Nearby",
      address: store.address,
      city: store.city,
    }));
  }, [brandDetails?.Images, nearbyStoresData, selectedCategory]);

  const combinedStores = apiStores.length > 0 ? apiStores : DEMO_STORES;

  const filteredStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return combinedStores.filter((store) => {
      const matchesQuery =
        !normalizedQuery ||
        store.name.toLowerCase().includes(normalizedQuery) ||
        store.address.toLowerCase().includes(normalizedQuery) ||
        store.city.toLowerCase().includes(normalizedQuery);

      const matchesCategory = !selectedCategory || store.category === selectedCategory;

      return matchesQuery && matchesCategory;
    });
  }, [combinedStores, query, selectedCategory]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory((current) => (current === category ? null : category));
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] pb-24">
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
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#11131d]">
            Near by Stores
          </h1>
        </div>
      </div>

      <SearchBar value={query} onChange={setQuery} />

      <div className="mt-4">
        <CategoryChips selectedCategory={selectedCategory} onSelect={handleCategorySelect} />
      </div>

      <div className="mt-4">
        <MapCard />
      </div>

      <div className="px-4 pt-5">
        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-[#171a24]">
          Trending Stores near you
        </h2>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="space-y-3 px-4 pb-24">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[98px] rounded-[18px] bg-white shadow-[0_12px_24px_rgba(36,43,77,0.08)]"
              />
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <StoreList stores={filteredStores} />
        ) : (
          <div className="px-4 pb-24 pt-3">
            <div className="rounded-[18px] bg-white px-4 py-4 text-[14px] font-medium text-[#6b7280] shadow-[0_12px_24px_rgba(36,43,77,0.08)]">
              No stores match your search.
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}

export default function Nearby() {
  return <NearbyStoresPage />;
}
