import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";
import { useFilterMeta } from "@/hooks/useFilterMeta";

type CategoryItem = {
  name: string;
  count?: number;
};

interface CategoriesBottomSheetProps {
  open: boolean;
  onClose: () => void;
}

function CategoryGrid({
  categoriesData,
  onCategoryClick,
}: {
  categoriesData: CategoryItem[];
  onCategoryClick: (category: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-[12px]">
      {categoriesData.map((category) => (
        <button
          key={category.name}
          onClick={() => onCategoryClick(category.name)}
          className="min-h-[86px] rounded-[14px] bg-white px-[14px] py-[13px] text-left shadow-[0_7px_18px_rgba(31,33,59,0.10)] active:scale-[0.98]"
        >
          <span className="block text-[14px] font-semibold leading-[18px] text-[#20222c]">
            {category.name}
          </span>
          {typeof category.count === "number" && (
            <span className="mt-[9px] block text-[11px] font-medium text-[#7a7f8f]">
              {category.count} brands
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function FilterPanel({
  open,
  filterChips,
  onClose,
}: {
  open: boolean;
  filterChips: string[];
  onClose: () => void;
}) {
  return (
    <aside
      className={`absolute bottom-0 right-0 top-0 z-20 w-[78%] rounded-tl-[24px] bg-white px-[18px] py-[22px] shadow-[-12px_0_28px_rgba(30,28,64,0.20)] transition-transform duration-300 ease-in-out ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[18px] font-bold leading-none text-[#151722]">Filters</h3>
        <button
          onClick={onClose}
          className="rounded-full bg-[#f0f1f7] px-[14px] py-[8px] text-[12px] font-semibold text-[#313447] active:scale-95"
        >
          Close
        </button>
      </div>

      <div className="mt-[24px] space-y-[12px]">
        {filterChips.map((chip) => (
          <button
            key={chip}
            className="w-full rounded-[13px] border border-[#e5e7f2] bg-[#f8f8fb] px-[14px] py-[13px] text-left text-[14px] font-semibold text-[#303241] active:scale-[0.99]"
          >
            {chip}
          </button>
        ))}
      </div>
    </aside>
  );
}

function BottomSheet({
  open,
  categoriesData,
  totalBrands,
  isLoading,
  onClose,
  onCategoryClick,
}: {
  open: boolean;
  categoriesData: CategoryItem[];
  totalBrands: number;
  isLoading: boolean;
  onClose: () => void;
  onCategoryClick: (category: string) => void;
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterChips = ["Super Cashbacks", "Today’s Pick", "Under ₹50"];

  useEffect(() => {
    if (!open) {
      setIsFilterOpen(false);
    }
  }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-black/35 transition-opacity duration-300 ease-in-out md:hidden ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <section
        className={`fixed bottom-0 left-0 right-0 z-[100] flex h-[88vh] flex-col overflow-hidden rounded-t-[28px] bg-[#f4f5fa] shadow-[0_-16px_36px_rgba(22,22,44,0.18)] transition-transform duration-300 ease-in-out md:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-[10px] h-[5px] w-[48px] rounded-full bg-[#c6cad6]" />

        <div className="flex items-center justify-between px-[20px] pt-[18px]">
          <h2 className="text-[22px] font-bold leading-none text-[#11131d]">Categories</h2>
          <button
            onClick={onClose}
            className="rounded-full bg-white px-[15px] py-[8px] text-[12px] font-semibold text-[#343746] shadow-[0_4px_12px_rgba(31,33,59,0.08)] active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-[9px] overflow-x-auto px-[20px] pb-[13px] pt-[18px] no-scrollbar">
          {filterChips.map((chip) => (
            <button
              key={chip}
              className="h-[34px] flex-shrink-0 rounded-full bg-white px-[14px] text-[12px] font-semibold text-[#2e3140] shadow-[0_4px_12px_rgba(31,33,59,0.08)] active:scale-95"
            >
              {chip}
            </button>
          ))}
          <button
            onClick={() => setIsFilterOpen((value) => !value)}
            className="h-[34px] flex-shrink-0 rounded-full bg-[#5b43c9] px-[17px] text-[12px] font-semibold text-white shadow-[0_6px_14px_rgba(91,67,201,0.24)] active:scale-95"
          >
            Filter
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[20px] pb-[82px] pt-[2px]">
          {isLoading ? (
            <div className="rounded-[14px] bg-white px-[16px] py-[18px] text-center text-[14px] font-medium text-[#707587] shadow-[0_7px_18px_rgba(31,33,59,0.10)]">
              Loading categories...
            </div>
          ) : categoriesData.length > 0 ? (
            <CategoryGrid categoriesData={categoriesData} onCategoryClick={onCategoryClick} />
          ) : (
            <div className="rounded-[14px] bg-white px-[16px] py-[18px] text-center text-[14px] font-medium text-[#707587] shadow-[0_7px_18px_rgba(31,33,59,0.10)]">
              No categories available
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-[#f4f5fa]/95 px-[20px] py-[16px] backdrop-blur-md">
          <p className="text-center text-[14px] font-semibold text-[#4a4d5d]">
            {totalBrands || 0} brands
          </p>
        </div>

        <FilterPanel
          open={isFilterOpen}
          filterChips={filterChips}
          onClose={() => setIsFilterOpen(false)}
        />
      </section>
    </>
  );
}

export default function CategoriesBottomSheet({ open, onClose }: CategoriesBottomSheetProps) {
  const [, setLocation] = useLocation();
  const { data: filterMeta, isLoading: metaLoading } = useFilterMeta();
  const { data: brandsRaw = [], isLoading: brandsLoading } = useBrands();
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      window.requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
      return;
    }

    setIsVisible(false);
    document.body.style.overflow = "";
    const timer = window.setTimeout(() => setShouldRender(false), 300);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [open]);

  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];

  const categoriesData = useMemo<CategoryItem[]>(() => {
    const categories = filterMeta?.categories || [];

    return categories.map((name) => {
      const count = brands.filter((brand: any) => {
        const brandCategory = brand.Category || brand.category || "";
        return brandCategory === name;
      }).length;

      return {
        name,
        count: count || undefined,
      };
    });
  }, [brands, filterMeta?.categories]);

  const handleCategoryClick = (category: string) => {
    const params = new URLSearchParams();
    params.set("categories", category);
    setLocation(`/brands?${params.toString()}`);
    onClose();
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <BottomSheet
      open={isVisible}
      categoriesData={categoriesData}
      totalBrands={brands.length}
      isLoading={metaLoading || brandsLoading}
      onClose={onClose}
      onCategoryClick={handleCategoryClick}
    />
  );
}
