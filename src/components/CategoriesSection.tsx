import { useState, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";
import { useFilterMeta } from "@/hooks/useFilterMeta";
import BrandCard from "@/components/BrandCard";
import QuickBuyModal from "@/components/QuickBuyModal";
import FilterSidebar from "@/components/FilterSidebar";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/types/brand";

interface CategoryFilterState {
  categories: string[];
  brands: string[];
  priceRange: string;
  sortBy: string;
  discountRanges: string[];
  sortOrder: string;
}

const DEFAULT_FILTERS: CategoryFilterState = {
  categories: [],
  brands: [],
  priceRange: "all",
  sortBy: "Popularity",
  discountRanges: [],
  sortOrder: "none",
};

// Same label -> numeric-bounds inference FilterSidebar's discount checkboxes
// rely on elsewhere (Brands.tsx) -- discount ranges only ever come through as
// display labels ("Up to 5%", "5% - 15%", ...), never as raw min/max numbers.
function inferDiscountBounds(rawValue: string): { min: number | null; max: number | null } {
  const normalized = rawValue.trim().toLowerCase();
  const numericParts = normalized.match(/(\d+(?:\.\d+)?)/g)?.map(Number) || [];

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
    return { min: value, max: value };
  }

  return { min: null, max: null };
}

function parseNumericDiscount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;
  if (typeof value === "string") {
    const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : NaN;
  }
  const coerced = Number(value);
  return Number.isFinite(coerced) ? coerced : NaN;
}

export default function CategoriesSection() {
  const { data: brands = [], isLoading } = useBrands();
  const { data: filterMeta } = useFilterMeta();
  const [filters, setFilters] = useState<CategoryFilterState>(DEFAULT_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [quickBuyBrand, setQuickBuyBrand] = useState<Brand | null>(null);

  const activeCategory = filters.categories[0] || null;

  const CATEGORIES = useMemo(() => {
    if (filterMeta?.categories && filterMeta.categories.length > 0) {
      return filterMeta.categories;
    }
    return Array.from(new Set((brands as Brand[]).map(b => b.Category).filter(Boolean))).sort();
  }, [filterMeta, brands]);

  const availablePriceRanges = filterMeta?.priceRanges ?? [];
  const availableDiscountRanges = filterMeta?.discountRanges ?? [];

  const activeFiltersCount =
    (filters.priceRange !== "all" ? 1 : 0) + filters.discountRanges.length;

  const filteredBrands = useMemo(() => {
    let result = brands as Brand[];

    if (activeCategory) {
      result = result.filter(b => (b.Category || "") === activeCategory);
    }

    if (filters.priceRange !== "all") {
      const selected = availablePriceRanges.find(r => r.label === filters.priceRange);
      if (selected) {
        const min = selected.min ?? Number.NEGATIVE_INFINITY;
        const max = selected.max ?? Number.POSITIVE_INFINITY;
        result = result.filter(b => {
          const brandMin = b.MinPrice ?? Number.NEGATIVE_INFINITY;
          const brandMax = b.MaxPrice ?? Number.POSITIVE_INFINITY;
          return brandMin <= max && brandMax >= min;
        });
      }
    }

    if (filters.discountRanges.length > 0) {
      result = result.filter(b => {
        const discountValue = parseNumericDiscount(b.Discount ?? 0);
        if (!Number.isFinite(discountValue)) return false;
        return filters.discountRanges.some(rangeKey => {
          const range = availableDiscountRanges.find(
            r => (r.value?.trim() || r.label) === rangeKey
          );
          const bounds = inferDiscountBounds(range?.value || range?.label || rangeKey);
          const min = bounds.min ?? Number.NEGATIVE_INFINITY;
          const max = bounds.max ?? Number.POSITIVE_INFINITY;
          return discountValue >= min && discountValue <= max;
        });
      });
    }

    return result;
  }, [brands, activeCategory, filters.priceRange, filters.discountRanges, availablePriceRanges, availableDiscountRanges]);

  const sortedBrands = useMemo(() => {
    const result = [...filteredBrands];

    const sortAlphabetically = (a: Brand, b: Brand) => {
      const nameA = (a.BrandName || "").trim();
      const nameB = (b.BrandName || "").trim();
      const numA = /^\d/.test(nameA);
      const numB = /^\d/.test(nameB);
      if (numA && !numB) return 1;
      if (!numA && numB) return -1;
      return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
    };

    switch (filters.sortOrder) {
      case "a-z":
        return result.sort(sortAlphabetically);
      case "z-a":
        return result.sort((a, b) => sortAlphabetically(b, a));
      case "discount-high-low":
        return result.sort((a, b) => parseFloat(b.Discount || "0") - parseFloat(a.Discount || "0"));
      case "discount-low-high":
        return result.sort((a, b) => parseFloat(a.Discount || "0") - parseFloat(b.Discount || "0"));
      case "none":
      default:
        return result.sort(sortAlphabetically);
    }
  }, [filteredBrands, filters.sortOrder]);

  return (
    <section className="bg-background pb-24">
      {/* Category pills + filter trigger */}
      <div className="flex items-center gap-2 px-6 pt-5 pb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          <button onClick={() => setFilters(f => ({ ...f, categories: [] }))}
            className="shrink-0 px-4 py-1.5 rounded-full font-bold text-xs border transition-all"
            style={{ background: !activeCategory ? "hsl(252,80%,58%)" : "hsl(var(--card))", color: !activeCategory ? "hsl(var(--card))" : "#6B7280", borderColor: !activeCategory ? "hsl(252,80%,58%)" : "#E5E7EB" }}>
            All
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilters(f => ({ ...f, categories: cat === activeCategory ? [] : [cat] }))}
              className="shrink-0 px-4 py-1.5 rounded-full font-bold text-xs border transition-all"
              style={{ background: activeCategory === cat ? "hsl(252,80%,58%)" : "hsl(var(--card))", color: activeCategory === cat ? "hsl(var(--card))" : "#6B7280", borderColor: activeCategory === cat ? "hsl(252,80%,58%)" : "#E5E7EB" }}>
              {cat}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="relative shrink-0 gap-1.5 rounded-full h-8 px-3"
          onClick={() => setFilterModalOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Filter</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {/* Brand grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square g-skeleton rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {sortedBrands.map((brand: Brand, i: number) => (
              <div key={brand.BrandId || i} className="anim-fade-up" style={{ animationDelay: `${Math.min(i, 18) * 0.04}s` }}>
                <BrandCard brand={brand} />
              </div>
            ))}
          </div>
        )}
      </div>

      {filterModalOpen && (
        <FilterSidebar
          isMobile
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={filters}
          onFilterChange={setFilters}
          availableCategories={CATEGORIES}
          availableBrands={[]}
          availablePriceRanges={availablePriceRanges}
          availableSortOptions={filterMeta?.sortOptions ?? ["Popularity"]}
          availableDiscountRanges={availableDiscountRanges}
        />
      )}

      {quickBuyBrand && (
        <QuickBuyModal brand={quickBuyBrand} isOpen={!!quickBuyBrand}
          onClose={() => setQuickBuyBrand(null)} brandImage="" />
      )}
    </section>
  );
}
