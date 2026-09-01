import React, { useMemo, useState } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { useLocation } from "wouter";
import { useFilterMeta } from '@/hooks/useFilterMeta';
import { useBrands } from '@/hooks/useBrands';
import CategorySection from '@/components/CategorySection';
import FilterSidebar from '@/components/FilterSidebar';
import Header from '@/components/Header';
import PaymentDetailsSheet from '@/components/PaymentDetailsSheet';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import homebackImg from "@/assets/HomeBack.png";

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

// Discount ranges only ever come through as display labels ("Up to 5%",
// "5% - 15%", ...), never as raw min/max numbers -- same inference the
// Brands page's own discount-range filter relies on.
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

function sortItems(items: any[], sortOrder: string) {
  const result = [...items];

  const sortAlphabetically = (a: any, b: any) => {
    const nameA = (a.BrandName || a.brandName || "").trim();
    const nameB = (b.BrandName || b.brandName || "").trim();
    const numA = /^\d/.test(nameA);
    const numB = /^\d/.test(nameB);
    if (numA && !numB) return 1;
    if (!numA && numB) return -1;
    return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
  };

  switch (sortOrder) {
    case "a-z":
      return result.sort(sortAlphabetically);
    case "z-a":
      return result.sort((a, b) => sortAlphabetically(b, a));
    case "discount-high-low":
      return result.sort((a, b) => parseFloat(b.Discount || b.discount || "0") - parseFloat(a.Discount || a.discount || "0"));
    case "discount-low-high":
      return result.sort((a, b) => parseFloat(a.Discount || a.discount || "0") - parseFloat(b.Discount || b.discount || "0"));
    case "none":
    default:
      return result.sort(sortAlphabetically);
  }
}

export default function Categories() {
  const [, setLocation] = useLocation();
  const { data: filterMeta } = useFilterMeta();
  const { data: brandsRaw = [] } = useBrands();
  const [filters, setFilters] = useState<CategoryFilterState>(DEFAULT_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];

  const categoryNames = filterMeta?.categories && filterMeta.categories.length ? filterMeta.categories : Array.from(new Set(brands.map((b: any) => b.Category).filter(Boolean))).sort();

  const availablePriceRanges = filterMeta?.priceRanges ?? [];
  const availableDiscountRanges = filterMeta?.discountRanges ?? [];

  const activeFiltersCount =
    filters.categories.length + (filters.priceRange !== "all" ? 1 : 0) + filters.discountRanges.length;

  // Price/discount range narrow the brand pool; a selected category (from
  // the filter panel) narrows which section(s) get shown at all.
  const filteredBrands = useMemo(() => {
    let result = brands;

    if (filters.priceRange !== "all") {
      const selected = availablePriceRanges.find(r => r.label === filters.priceRange);
      if (selected) {
        const min = selected.min ?? Number.NEGATIVE_INFINITY;
        const max = selected.max ?? Number.POSITIVE_INFINITY;
        result = result.filter((b: any) => {
          const brandMin = b.MinPrice ?? Number.NEGATIVE_INFINITY;
          const brandMax = b.MaxPrice ?? Number.POSITIVE_INFINITY;
          return brandMin <= max && brandMax >= min;
        });
      }
    }

    if (filters.discountRanges.length > 0) {
      result = result.filter((b: any) => {
        const discountValue = parseNumericDiscount(b.Discount ?? b.discount ?? 0);
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
  }, [brands, filters.priceRange, filters.discountRanges, availablePriceRanges, availableDiscountRanges]);

  const categoryMap = useMemo(() => {
    const selectedCategory = filters.categories[0];
    const names = selectedCategory ? [selectedCategory] : categoryNames;

    return names
      .map((category: string) => ({
        name: category,
        items: sortItems(
          filteredBrands.filter((brand: any) => (brand.Category || brand.category || '') === category),
          filters.sortOrder
        ),
      }))
      .filter(section => section.items.length > 0);
  }, [filteredBrands, categoryNames, filters.categories, filters.sortOrder]);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="min-h-screen w-full pb-24 relative">
        <div
          className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${homebackImg})` }}
        />
        <div className="relative z-10">
      <header
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #F0F0F0" }}
      >
        <button
          onClick={() => setLocation("/")}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: "#1a1a1a" }} />
        </button>
        <h1 className="font-semibold text-sm absolute left-1/2 -translate-x-1/2">Categories</h1>
        <Button
          variant="outline"
          size="sm"
          className="relative w-10 h-10 p-0 rounded-full"
          onClick={() => setFilterModalOpen(true)}
          aria-label="Filter and sort"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </header>

      <div className="px-4 pt-6 space-y-6">
        {categoryMap.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">No brands match the selected filters.</p>
        )}
        {categoryMap.map((section) => (
          <CategorySection key={section.name} title={section.name} items={section.items} onBuy={(id: string) => { setSheetBrandId(id); setBuySheetOpen(true); }} />
        ))}
      </div>

      {filterModalOpen && (
        <FilterSidebar
          isMobile
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filters={filters}
          onFilterChange={setFilters}
          availableCategories={categoryNames}
          availableBrands={[]}
          availablePriceRanges={availablePriceRanges}
          availableSortOptions={filterMeta?.sortOptions ?? ["Popularity"]}
          availableDiscountRanges={availableDiscountRanges}
          showCategories={false}
          showAlphabeticalSort={false}
        />
      )}

      <PaymentDetailsSheet brandId={sheetBrandId} open={buySheetOpen} onClose={() => setBuySheetOpen(false)} />
      <MobileBottomNav />
        </div>
      </main>
    </>
  );
}
