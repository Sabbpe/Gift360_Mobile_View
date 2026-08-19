import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import FilterSidebar from "@/components/FilterSidebar";
import { useQueryLocation } from "@/hooks/useQueryLocation";
import { useFilterMeta } from "@/hooks/useFilterMeta";
import { useFilteredBrands } from "@/hooks/useFilteredBrands";
import { useBrandSearch } from "@/hooks/useBrandSearch";
import BrandsPageSkeleton from "@/components/BrandsPageSkeleton";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/MobileBottomNav";
import { FloatingCoins } from "@/components/FloatingCoins";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import BrandVoucherModal from "@/components/BrandVoucherModal";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import { isSuperCoinExcludedById, isSuperCoinExcluded, isSuperCoinEligible } from "@/lib/supercoin-excluded-brands";
import {
  fetchBrandVoucherList,
  fetchTopBrands,
  type TopBrandVoucher,
} from "@/api/brandSearchApi";

interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: string;
  sortBy: string;
  discountRanges: string[];
  sortOrder: string;
}

interface Brand {
  BrandId?: string;
  brandId?: string;
  BrandName?: string;
  brandName?: string;
  Category?: string;
  category?: string;
}


// Add this custom hook BEFORE the Brands component
function useSearchParams() {
  const [searchParams, setSearchParams] = useState(window.location.search);

  useEffect(() => {
    const handleLocationChange = () => {
      setSearchParams(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      handleLocationChange();
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  return searchParams;
}




export default function Brands() {
  const enableBrandSearchUI = false;
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isPaymentSheetOpen, setIsPaymentSheetOpen] = useState(false);
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);
  const [sheetInitialAmount, setSheetInitialAmount] = useState<number | undefined>(undefined);
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherBrandName, setVoucherBrandName] = useState("");
  const [voucherBrandId, setVoucherBrandId] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<TopBrandVoucher[]>([]);
const searchInputRef = useRef<HTMLInputElement>(null);
const suggestionsRef = useRef<HTMLDivElement>(null);
const rowRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
const [, navigate] = useLocation();

// Close suggestions when clicking outside
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


  // Get category from URL if present
  const [currentLocation] = useLocation();
  const searchParams = useSearchParams();
  console.log('🌐 Full URL:', window.location.href);
  console.log('🌐 Wouter location:', currentLocation);
  console.log('🌐 Search params:', window.location.search);
  const urlParams = new URLSearchParams(searchParams);
  const categoryFromUrl = urlParams.get('categories');
  const tabFromUrl = urlParams.get('tab') as "about" | "how" | "terms" | null;
  const brandIdFromUrl = urlParams.get('brandId');
  const superCoinsOnly = urlParams.get("supercoins") === "1";

  const [sheetInitialTab, setSheetInitialTab] = useState<"about" | "how" | "terms" | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    categories: categoryFromUrl ? [categoryFromUrl] : [],
    brands: [],
    priceRange: "all",
    sortBy: "Popularity",
    discountRanges: [],
    sortOrder: "none",
  });

  const itemsPerPage = 48; // 8 rows × 6 columns
  const { data, isLoading, isError } = useQuery({
    queryKey: ["brands-menu-page"],
    queryFn: fetchTopBrands,
  });
  const { data: filterMeta, isLoading: metaLoading } = useFilterMeta();

  // Backend search query - only triggered when user presses Enter
  const { data: searchResults, isLoading: searchLoading } = useBrandSearch(submittedSearchQuery);

  const safeBrands = Array.isArray(data) ? data : [];

  // Auto-open PaymentDetailsSheet when URL has ?tab=how&brandId=xxx
  useEffect(() => {
    if (brandIdFromUrl && tabFromUrl && !isPaymentSheetOpen) {
      setSheetBrandId(brandIdFromUrl);
      setSheetInitialTab(tabFromUrl);
      setIsPaymentSheetOpen(true);
    }
  }, [brandIdFromUrl, tabFromUrl, data]);

// Filter brands based on search query for suggestions
const filteredBrandSuggestions = useMemo(() => {
  let results = safeBrands;

  if (superCoinsOnly) {
    results = results.filter((brand: Brand) =>
      isSuperCoinEligible(
        brand.BrandId || brand.brandId || "",
        brand.BrandName || brand.brandName || ""
      )
    );
  }
  
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    results = results.filter((brand: Brand) => {
      const brandName = brand.BrandName || brand.brandName || "";
      return brandName.toLowerCase().includes(query);
    });
  }

  // ✅ Sort alphabetically, moving number-starting names to the end
  return results.sort((a: Brand, b: Brand) => {
    const nameA = (a.BrandName || a.brandName || "").trim();
    const nameB = (b.BrandName || b.brandName || "").trim();
    
    const startsWithNumberA = /^\d/.test(nameA);
    const startsWithNumberB = /^\d/.test(nameB);
    
    if (startsWithNumberA && !startsWithNumberB) return 1;
    if (!startsWithNumberA && startsWithNumberB) return -1;
    
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  });
}, [safeBrands, searchQuery, superCoinsOnly]);


  // Use meta data from API
  const availableCategories = filterMeta?.categories ?? [];
  const availableBrands = filterMeta?.brands ?? [];
  const availablePriceRanges = filterMeta?.priceRanges ?? [];
  const availableSortOptions = filterMeta?.sortOptions ?? ["Popularity"];
  const availableDiscountRanges = [
    { label: "0 - 20%", value: "0-20" },
    { label: "20%+", value: "20+" },
  ];


  // Helper to convert display name to backend value
  const mapSortByToBackend = (displayName: string): string => {
    switch (displayName) {
      case "Price: Low to High":
        return "price-low";
      case "Price: High to Low":
        return "price-high";
      case "Brand: A to Z":
        return "brand-az";
      case "Brand: Z to A":
        return "brand-za";
      case "Popularity":
      default:
        return "popularity";
    }
  };

  // Helper to get min/max from selected price range
  const getPriceRangeValues = (
    rangeLabel: string
  ): { min: number | null; max: number | null } => {
    if (rangeLabel === "all") {
      return { min: null, max: null };
    }

    const selectedRange = availablePriceRanges.find(
      (r) => r.label === rangeLabel
    );
    return selectedRange
      ? { min: selectedRange.min, max: selectedRange.max }
      : { min: null, max: null };
  };

  const filterRequestBody = useMemo(() => {
    const priceRange = getPriceRangeValues(filters.priceRange);

    return {
      categories: filters.categories,
      brands: filters.brands,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      sortBy: mapSortByToBackend(filters.sortBy),
      discountRanges: filters.discountRanges,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.categories, filters.brands, filters.priceRange, filters.sortBy, filters.discountRanges]);

  // Call backend filter API
  const { data: filteredData, isLoading: filterLoading } =
    useFilteredBrands(filterRequestBody);

  const activeFiltersCount =
    filters.categories.length +
    filters.brands.length +
    (filters.priceRange !== "all" ? 1 : 0) +
    filters.discountRanges.length;

  // Determine which data to use: search results or filtered results
  const displayBrands = useMemo(() => {
    if (submittedSearchQuery.trim()) {
      return Array.isArray(searchResults) ? searchResults : [];
    }

    if (activeFiltersCount > 0) {
      return Array.isArray(filteredData) ? filteredData : [];
    }

    return safeBrands;
  }, [submittedSearchQuery, searchResults, activeFiltersCount, filteredData, safeBrands]);

  const eligibleDisplayBrands = useMemo(() => {
    if (!superCoinsOnly) {
      return displayBrands;
    }

    return (displayBrands as any[]).filter((brand) =>
      isSuperCoinEligible(
        brand.BrandId || brand.brandId || "",
        brand.BrandName || brand.brandName || ""
      )
    );
  }, [displayBrands, superCoinsOnly]);

  const inferDiscountBounds = (
    rawValue: string,
    index = 0,
    total = 0
  ): { min: number | null; max: number | null } => {
    const normalized = rawValue.trim().toLowerCase();
    const numericParts = normalized.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || [];

    const explicitLow = /\b(low|budget|starter|basic)\b/.test(normalized);
    const explicitMid = /\b(medium|mid|moderate)\b/.test(normalized);
    const explicitHigh = /\b(high|premium|top)\b/.test(normalized);

    if (numericParts.length >= 2 && /-|to|through|upto/.test(normalized)) {
      return { min: Math.min(numericParts[0], numericParts[1]), max: Math.max(numericParts[0], numericParts[1]) };
    }

    if (numericParts.length === 1) {
      const value = numericParts[0];

      if (/\b(up to|under|below|less than|max|maximum)\b/.test(normalized)) {
        return { min: null, max: value };
      }

      if (/\b(above|over|more than|greater than|min|minimum|at least)\b/.test(normalized) || /\+$/.test(normalized) || /\bplus\b/.test(normalized)) {
        return { min: value, max: null };
      }

      if (/\b0[-\s]?20\b/.test(normalized) || /0\s*-\s*20/.test(normalized)) {
        return { min: 0, max: 20 };
      }

      if (/\b20\+\b/.test(normalized) || /20\s*\+/.test(normalized)) {
        return { min: 20, max: null };
      }

      if (explicitLow) return { min: 0, max: 20 };
      if (explicitMid) return { min: 21, max: 40 };
      if (explicitHigh) return { min: 41, max: null };

      return { min: value, max: value };
    }

    if (numericParts.length === 0) {
      if (explicitLow) return { min: 0, max: 20 };
      if (explicitMid) return { min: 21, max: 40 };
      if (explicitHigh) return { min: 41, max: null };

      if (total <= 1) return { min: 0, max: null };
      if (total === 2) return index === 0 ? { min: 0, max: 20 } : { min: 20, max: null };
      if (total === 3) {
        return index === 0
          ? { min: 0, max: 20 }
          : index === 1
            ? { min: 21, max: 40 }
            : { min: 41, max: null };
      }

      return index === 0
        ? { min: 0, max: 20 }
        : index === 1
          ? { min: 21, max: 40 }
          : index === 2
            ? { min: 41, max: 60 }
            : { min: 61, max: null };
    }

    if (/\b(up to|under|below|less than|max|maximum)\b/.test(normalized)) {
      return { min: null, max: numericParts[0] };
    }

    if (/\b(above|over|more than|greater than|min|minimum|at least)\b/.test(normalized) || /\+$/.test(normalized) || /\bplus\b/.test(normalized)) {
      return { min: numericParts[0], max: null };
    }

    if (numericParts[1] !== undefined) {
      return { min: Math.min(numericParts[0], numericParts[1]), max: Math.max(numericParts[0], numericParts[1]) };
    }

    return { min: numericParts[0], max: numericParts[0] };
  };

  const discountRangeDefinitions = useMemo(() => {
    const total = availableDiscountRanges.length;

    return availableDiscountRanges.map((range, index) => {
      const key = (range.value || range.label).trim();
      return {
        key,
        label: range.label,
        ...inferDiscountBounds(range.value || range.label, index, total),
      };
    });
  }, [availableDiscountRanges]);

  const discountRangeLabelByKey = useMemo(() => {
    return new Map(discountRangeDefinitions.map((range) => [range.key, range.label]));
  }, [discountRangeDefinitions]);

  const discountRangeByKey = useMemo(() => {
    return new Map(discountRangeDefinitions.map((range) => [range.key, range]));
  }, [discountRangeDefinitions]);

  const parseNumericDiscount = (value: unknown): number => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : NaN;
    }

    if (typeof value === "string") {
      const normalized = value.replace(/,/g, "");
      const match = normalized.match(/(\d+(?:\.\d+)?)/);
      return match ? Number(match[1]) : NaN;
    }

    const coerced = Number(value);
    return Number.isFinite(coerced) ? coerced : NaN;
  };

  const matchesDiscountRange = (brand: any, rangeKey: string) => {
    const discountValue = parseNumericDiscount(
      brand.discount ?? brand.Discount ?? brand.cashback ?? 0
    );
    if (!Number.isFinite(discountValue)) return false;

    const range =
      discountRangeByKey.get(rangeKey) ||
      inferDiscountBounds(rangeKey);

    const min = range.min ?? Number.NEGATIVE_INFINITY;
    const max = range.max ?? Number.POSITIVE_INFINITY;
    return discountValue >= min && discountValue <= max;
  };

  const brandsAfterDiscountFilter = useMemo(() => {
    if (!filters.discountRanges.length) {
      return eligibleDisplayBrands;
    }

    return (eligibleDisplayBrands as any[]).filter((brand) =>
      filters.discountRanges.some((rangeKey) => matchesDiscountRange(brand, rangeKey))
    );
  }, [eligibleDisplayBrands, filters.discountRanges, discountRangeByKey]);

// Frontend sorting logic
const sortedDisplayBrands = useMemo(() => {
  const brands = [...brandsAfterDiscountFilter as any[]];
  
  // Helper function for alphabetical sorting with numbers at the end
  const sortAlphabetically = (a: any, b: any) => {
    const nameA = (a.brandName || a.BrandName || "").trim();
    const nameB = (b.brandName || b.BrandName || "").trim();
    
    const startsWithNumberA = /^\d/.test(nameA);
    const startsWithNumberB = /^\d/.test(nameB);
    
    // If one starts with number and other doesn't, number goes last
    if (startsWithNumberA && !startsWithNumberB) return 1;
    if (!startsWithNumberA && startsWithNumberB) return -1;
    
    // Both start with letter or both start with number - sort alphabetically
    return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
  };
  
  switch (filters.sortOrder) {
    case "a-z":
      return brands.sort(sortAlphabetically);
    
    case "z-a":
      return brands.sort((a, b) => {
        const nameA = (a.brandName || a.BrandName || "").trim();
        const nameB = (b.brandName || b.BrandName || "").trim();
        
        const startsWithNumberA = /^\d/.test(nameA);
        const startsWithNumberB = /^\d/.test(nameB);
        
        // If one starts with number and other doesn't, number goes last
        if (startsWithNumberA && !startsWithNumberB) return 1;
        if (!startsWithNumberA && startsWithNumberB) return -1;
        
        // Both start with letter or both start with number - sort Z to A
        return nameB.localeCompare(nameA, undefined, { sensitivity: 'base' });
      });
    
    case "discount-high-low":
      return brands.sort((a, b) => {
        const discountA = parseFloat(a.discount || a.Discount || "0");
        const discountB = parseFloat(b.discount || b.Discount || "0");
        return discountB - discountA;
      });
    
    case "discount-low-high":
      return brands.sort((a, b) => {
        const discountA = parseFloat(a.discount || a.Discount || "0");
        const discountB = parseFloat(b.discount || b.Discount || "0");
        return discountA - discountB;
      });
    
    case "none":
    default:
      // ✅ DEFAULT: Always sort alphabetically A-Z with numbers at end
      return brands.sort(sortAlphabetically);
  }
}, [brandsAfterDiscountFilter, filters.sortOrder]);

  const normalizeValue = (value?: string) =>
    (value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");

  const getBrandNameCandidates = (brand: Brand | any) => {
    const values = [
      brand.BrandName,
      brand.brandName,
      brand.BrandCode,
      brand.brandCode,
    ]
      .filter(Boolean)
      .map((value) => normalizeValue(value));

    return Array.from(new Set(values));
  };

  const resolveCanonicalBrandId = (brand: Brand | any) => {
    const brandNameCandidates = getBrandNameCandidates(brand);
    const category = normalizeValue(brand.Category || brand.category);

    const exactMatch = safeBrands.find((item: Brand) => {
      const itemName = normalizeValue(item.BrandName || item.brandName);
      const itemCategory = normalizeValue(item.Category || item.category);
      return (
        brandNameCandidates.includes(itemName) &&
        (!category || itemCategory === category)
      );
    });

    if (exactMatch?.BrandId) {
      return exactMatch.BrandId;
    }

    const nameMatch = safeBrands.find((item: Brand) => {
      const itemName = normalizeValue(item.BrandName || item.brandName);
      return brandNameCandidates.includes(itemName);
    });

    const partialMatch = safeBrands.find((item: Brand) => {
      const itemName = normalizeValue(item.BrandName || item.brandName);
      return (
        brandNameCandidates.some(
          (candidate) => candidate && (candidate.includes(itemName) || itemName.includes(candidate))
        )
      );
    });

    return (
      nameMatch?.BrandId ||
      partialMatch?.BrandId ||
      brand.BrandCode ||
      brand.brandCode ||
      brand.BrandId ||
      brand.brandId ||
      ""
    );
  };

  const [row1Brands, row2Brands, row3Brands] = useMemo(() => {
    const row1: any[] = [];
    const row2: any[] = [];
    const row3: any[] = [];

    sortedDisplayBrands.forEach((brand: any, index: number) => {
      if (index % 3 === 0) row1.push(brand);
      else if (index % 3 === 1) row2.push(brand);
      else row3.push(brand);
    });

    return [row1, row2, row3];
  }, [sortedDisplayBrands]);

  const renderBrandCard = (brand: any, index: number) => {
    const brandId = resolveCanonicalBrandId(brand);
    const brandName = brand.brandName || brand.BrandName || "Brand";
    const imageUrl = getImageUrl(brand) || "/icons/ecommerce.png";

    return (
      <div
        key={`${brandId || brandName}-${index}`}
        className="brand-card"
        onClick={() => {
          if (brandId) {
            void openVoucherModal(brandId, brandName);
          }
        }}
      >
        <div className="relative inline-block">
          <img src={imageUrl} alt={brandName} loading="lazy" className="brand-logo" onError={(e) => { const target = e.target as HTMLImageElement; if (!target.dataset.fallback) { target.dataset.fallback = "1"; target.src = `https://images.gift360.io/${brandId}.png`; } else { target.src = "/brand-placeholder.png"; } }} />
          {!isSuperCoinExcludedById(brandId) && !isSuperCoinExcluded(brandName) && (
            <img src={superCoinImg} alt="SuperCoin" className="absolute -top-1 -right-1 w-[18px] h-[18px] object-contain drop-shadow-sm z-10 pointer-events-none" />
          )}
        </div>
        <span>{brandName}</span>
      </div>
    );
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchToggle = () => {
  setShowSuggestions(prev => !prev);
};

const openVoucherModal = async (brandId: string, fallbackName?: string) => {
  setVoucherBrandId(brandId);
  setVoucherBrandName(fallbackName || "");
  setVoucherError(null);
  setVouchers([]);
  setVoucherModalOpen(true);
  setVoucherLoading(true);

  try {
    const response = await fetchBrandVoucherList(brandId);
    setVouchers(response);
    setVoucherBrandName(response[0]?.brandName || fallbackName || "Brand Vouchers");
  } catch (error: any) {
    console.error("Failed to fetch brand vouchers:", error);
    setVoucherError(error?.message || "Please try again.");
  } finally {
    setVoucherLoading(false);
  }
};

const handleBrandClick = (brand: Brand) => {
  const brandId = resolveCanonicalBrandId(brand);
  if (brandId) {
    void openVoucherModal(brandId, brand.BrandName || brand.brandName || "");
    setSearchQuery("");
    setShowSuggestions(false);
  }
};

const handleVoucherSelect = (voucher: TopBrandVoucher) => {
  setSheetBrandId(voucher.brandId);
  setSheetInitialAmount(
    voucher.minPrice > 0 ? voucher.minPrice : voucher.maxPrice > 0 ? voucher.maxPrice : undefined
  );
  setIsPaymentSheetOpen(true);
};

  const handleSearchSubmit = () => {
    setSubmittedSearchQuery(searchQuery);
    setCurrentPage(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  const handlePageChange = (selectedItem: { selected: number }) => {
    setCurrentPage(selectedItem.selected);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { query } = useQueryLocation();
  const brandFilter = new URLSearchParams(query).get("brand");

  // Handle category filter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(searchParams);
    const categoryParam = urlParams.get('categories');

    setFilters(prev => {
      const currentCategory = prev.categories[0];

      if (categoryParam && categoryParam !== currentCategory) {
        return { ...prev, categories: [categoryParam] };
      } else if (!categoryParam && prev.categories.length > 0) {
        return { ...prev, categories: [] };
      }

      return prev;
    });

    if (categoryParam) {
      setCurrentPage(0);
    }
  }, [searchParams]);  // ✅ Watch window.location.search instead

  // ADD THIS USEEFFECT after the category filter useEffect (around line 175)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');

    if (searchParam && searchParam.trim()) {
      if (searchParam !== submittedSearchQuery) {
        setSearchQuery(searchParam);
        setSubmittedSearchQuery(searchParam);
        setCurrentPage(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.search]);




  useEffect(() => {
    if (brandFilter) {
      setFilters((prev) => ({
        ...prev,
        brands: [brandFilter],
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandFilter]);

  useEffect(() => {
    if (brandFilter) {
      setCurrentPage(0);
    }
  }, [brandFilter]);

  // Show loading state when searching or filtering
  const isLoadingState =
    isLoading ||
    metaLoading ||
    searchLoading ||
    (activeFiltersCount > 0 && filterLoading);

  if (isLoadingState && !displayBrands.length) {
    return <BrandsPageSkeleton />;
  }

  if (isError) {
    return (
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-hero-aurora">
          <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        </div>
        <div className="relative">
          <Header />
          <div className="flex-1 flex items-center justify-center py-32">
            <div className="text-center rounded-3xl bg-blackcard card-edge p-8 max-w-md mx-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-extrabold mb-2"><span className="text-gold-gradient">Failed to load brands</span></h3>
              <p className="text-white/70 mb-4">Please try again later or refresh the page</p>
              <button onClick={() => window.location.reload()} className="h-11 px-6 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                Refresh Page
              </button>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Aurora backdrop */}
      <div className="absolute inset-0" style={{ background: '#F3F5F9' }}>
        <div className="absolute inset-0 hero-grain opacity-30 pointer-events-none" />
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-yellow-400/8 blur-3xl" />
      </div>
      <FloatingCoins />

      <div className="relative flex flex-col flex-1">
      <Header />

      <main className="flex-1">
        {/* HEADER BAR */}
        <header
          className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100"
        >
          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" style={{ color: "#1a1a1a" }} />
          </button>
          <h1 className="font-semibold text-lg absolute left-1/2 -translate-x-1/2">All Brands</h1>
          <div className="w-10 h-10" />
        </header>

        {/* SEARCH + FILTER ROW - MOBILE */}
        <div className="lg:hidden px-4 py-3 bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#9CA3AF" }} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => {
                  handleSearchChange(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyPress}
                className="w-full h-10 pl-9 pr-3 rounded-full bg-gray-100 text-sm font-medium outline-none"
                style={{ color: "#1a1a1a" }}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-label="Open filters"
              className="shrink-0 w-10 h-10 grid place-items-center rounded-full bg-[#6C5CE7] text-white shadow-[0_4px_12px_rgba(108,92,231,0.28)] transition-transform active:scale-95 hover:scale-105"
            >
              <SlidersHorizontal className="h-5 w-5" strokeWidth={2.2} />
              {activeFiltersCount > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-white px-0.5 text-[8px] font-bold leading-[14px] text-center text-[#6C5CE7] shadow-sm translate-x-0 translate-y-0">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Suggestions */}
          {showSuggestions && filteredBrandSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              {filteredBrandSuggestions.map((brand: Brand, index: number) => {
                const brandName = brand.BrandName || brand.brandName || "";
                const brandCategory = brand.Category || brand.category || "";
                return (
                  <button
                    key={`${brand.BrandId || brand.brandId}-${index}`}
                    onClick={() => handleBrandClick(brand)}
                    className="flex w-full flex-col gap-0.5 border-b border-gray-100 px-4 py-3 text-left last:border-0 hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-900">{brandName}</span>
                    {brandCategory && (
                      <span className="text-xs text-gray-500">{brandCategory}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FILTER CHIPS */}
        <div className="lg:hidden px-4 py-2 bg-white border-b border-gray-100 flex flex-wrap gap-2">
          {/* Selected Category Chip */}
          {filters.categories.length > 0 && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              <span>{filters.categories[0]}</span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, categories: [] }))}
                className="hover:bg-purple-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {/* Selected Brand Chips */}
          {filters.brands.map((brand) => (
            <div key={brand} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              <span>{brand}</span>
              <button
                onClick={() => {
                  const newBrands = filters.brands.filter(b => b !== brand);
                  setFilters(prev => ({ ...prev, brands: newBrands }));
                }}
                className="hover:bg-purple-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {/* Price Range Chip */}
          {filters.priceRange !== "all" && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
              <span>{filters.priceRange}</span>
              <button
                onClick={() => setFilters(prev => ({ ...prev, priceRange: "all" }))}
                className="hover:bg-purple-100 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          {/* Discount Range chips */}
          {filters.discountRanges.map((discount) => (
            <button
              key={discount}
              onClick={() => {
                setFilters({
                  ...filters,
                  discountRanges: filters.discountRanges.filter((d) => d !== discount),
                });
              }}
              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 transition-colors"
            >
              <span>{discountRangeLabelByKey.get(discount) || discount}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>

        {enableBrandSearchUI && (
          <div className="lg:hidden sticky top-[132px] z-30 bg-[linear-gradient(135deg,#523da9_0%,#4c42b8_48%,#5365df_100%)] px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search brands, vouchers..."
                value={searchQuery}
                onChange={(e) => {
                  handleSearchChange(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setShowSuggestions(true);
                }}
                onKeyDown={handleKeyPress}
                className="h-[44px] w-full rounded-[16px] border border-[#e5e7eb] bg-white pl-10 pr-4 text-[13px] font-medium text-[#111827] shadow-[0_4px_10px_rgba(0,0,0,0.06)] placeholder:text-[#6b7280]"
              />

              {showSuggestions && filteredBrandSuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                >
                  {filteredBrandSuggestions.map((brand: Brand, index: number) => {
                    const brandName = brand.BrandName || brand.brandName || "";
                    const brandCategory = brand.Category || brand.category || "";

                    return (
                      <button
                        key={`${brand.BrandId || brand.brandId}-${index}`}
                        onClick={() => handleBrandClick(brand)}
                        className="flex w-full flex-col gap-0.5 border-b border-[#f3f4f6] px-4 py-3 text-left last:border-0"
                      >
                        <span className="text-sm font-semibold text-[#111827]">{brandName}</span>
                        {brandCategory && (
                          <span className="text-xs text-[#6b7280]">{brandCategory}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {enableBrandSearchUI && (
          <div className="hidden lg:block sticky top-16 z-30 bg-[linear-gradient(135deg,#523da9_0%,#4c42b8_48%,#5365df_100%)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search brands, vouchers..."
                  value={searchQuery}
                  onChange={(e) => {
                    handleSearchChange(e);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSuggestions(true);
                  }}
                  onKeyDown={handleKeyPress}
                  className="h-[44px] w-full rounded-[16px] border border-[#e5e7eb] bg-white pl-10 pr-4 text-[13px] font-medium text-[#111827] shadow-[0_4px_10px_rgba(0,0,0,0.06)] placeholder:text-[#6b7280]"
                />

                {showSuggestions && filteredBrandSuggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-[16px] border border-[#e5e7eb] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
                  >
                    {filteredBrandSuggestions.map((brand: Brand, index: number) => {
                      const brandName = brand.BrandName || brand.brandName || "";
                      const brandCategory = brand.Category || brand.category || "";

                      return (
                        <button
                          key={`${brand.BrandId || brand.brandId}-${index}`}
                          onClick={() => handleBrandClick(brand)}
                          className="flex w-full flex-col gap-0.5 border-b border-[#f3f4f6] px-4 py-3 text-left last:border-0"
                        >
                          <span className="text-sm font-semibold text-[#111827]">{brandName}</span>
                          {brandCategory && (
                            <span className="text-xs text-[#6b7280]">{brandCategory}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* MAIN CONTENT WITH SIDEBAR */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex gap-8">
            {/* FILTER SIDEBAR - Desktop */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-32">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  availableCategories={availableCategories}
                  availableBrands={availableBrands}
                  availablePriceRanges={availablePriceRanges}
                  availableSortOptions={availableSortOptions}
                  availableDiscountRanges={filterMeta?.discountRanges || []}
                />
              </div>
            </aside>

            {/* FILTER MODAL - Mobile Full Screen */}
            <div className="lg:hidden">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                availableCategories={availableCategories}
                availableBrands={availableBrands}
                availablePriceRanges={availablePriceRanges}
                availableSortOptions={availableSortOptions}
                availableDiscountRanges={filterMeta?.discountRanges || []}
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                isMobile={true}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSearchSubmit={handleSearchSubmit}
                allBrandsData={eligibleDisplayBrands}
              />
            </div>


            {/* BRANDS GRID */}
            <div className="flex-1 min-w-0">
              {/* Results Count */}
              {sortedDisplayBrands.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-[#374151]">
                    Showing <span className="font-semibold text-[#111827]">{sortedDisplayBrands.length}</span> brands
                    {superCoinsOnly && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        SuperCoins eligible only
                      </span>
                    )}
                    {submittedSearchQuery.trim() && (
                      <span className="ml-2 text-[hsl(var(--primary))]">
                        (searching for "{submittedSearchQuery}")
                      </span>
                    )}
                    {!submittedSearchQuery.trim() && activeFiltersCount > 0 && (
                      <span className="ml-2 text-[hsl(var(--primary))]">
                        ({activeFiltersCount} filter
                        {activeFiltersCount !== 1 ? "s" : ""} active)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <section className="mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="brand-title">Brands</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        rowRefs.current.forEach(el => {
                          if (el) el.scrollBy({ left: -(100 + 12) * 2, behavior: "smooth" });
                        });
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: "#6C5CE7", color: "white" }}
                    >
                      &lt;-
                    </button>
                    <button
                      onClick={() => {
                        rowRefs.current.forEach(el => {
                          if (el) el.scrollBy({ left: (100 + 12) * 2, behavior: "smooth" });
                        });
                      }}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: "#6C5CE7", color: "white" }}
                    >
                      -&gt;
                    </button>
                  </div>
                </div>
                <div className="brands-container">
                  {[row1Brands, row2Brands, row3Brands].map((row, i) => (
                    <div key={i} className="mb-3 last:mb-0">
                      <div className="brand-row" ref={el => rowRefs.current[i] = el}>
                        {row.map(renderBrandCard)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* No Results */}
              {sortedDisplayBrands.length === 0 && (
                <div className="text-center py-16 lg:py-20 rounded-3xl bg-blackcard card-edge">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-4">
                    <Search className="h-8 w-8 text-amber-300" />
                  </div>
                  <h3 className="text-xl font-extrabold mb-2"><span className="text-gold-gradient">No brands found</span></h3>
                  <p className="text-white/60 mb-4">
                    {superCoinsOnly
                      ? "No SuperCoins eligible brands matched your current search or filters."
                      : submittedSearchQuery.trim()
                        ? `No results found for "${submittedSearchQuery}"`
                        : "Try adjusting your filters or search term"}
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSubmittedSearchQuery("");
                      setFilters({
                        categories: [],
                        brands: [],
                        priceRange: "all",
                        sortBy: "Popularity",
                        discountRanges: [],
                        sortOrder: "none",
                      });
                    }}
                    className="h-10 px-5 rounded-xl border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all"
                  >
                    Clear all {submittedSearchQuery.trim() ? "search and filters" : "filters"}
                  </button>
                </div>
              )}

            </div>
          </div>
        </section>
      </main>

      <Footer />
      <MobileBottomNav />
      <BrandVoucherModal
        open={voucherModalOpen}
        vouchers={vouchers}
        brandName={voucherBrandName}
        loading={voucherLoading}
        error={voucherError}
        onClose={() => {
          setVoucherModalOpen(false);
          setVoucherLoading(false);
          setVoucherError(null);
          setVoucherBrandName("");
          setVoucherBrandId(null);
          setVouchers([]);
        }}
        onRetry={() => {
          if (voucherBrandId) {
            void openVoucherModal(voucherBrandId, voucherBrandName);
          }
        }}
        onVoucherSelect={handleVoucherSelect}
      />
      <PaymentDetailsSheet
        brandId={sheetBrandId}
        open={isPaymentSheetOpen}
        initialAmount={sheetInitialAmount}
        initialTab={sheetInitialTab}
        onClose={() => {
          setIsPaymentSheetOpen(false);
          setSheetBrandId(null);
          setSheetInitialAmount(undefined);
          setSheetInitialTab(null);
        }}
      />
      </div>
    </div>
  );
}
