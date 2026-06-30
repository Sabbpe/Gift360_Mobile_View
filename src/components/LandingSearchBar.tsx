import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBrandNames } from "@/hooks/useBrandNames";

type LandingSearchBarProps = {
  onBrandSelect: (brandId: string) => void;
};

export default function LandingSearchBar({ onBrandSelect }: LandingSearchBarProps) {
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
          placeholder="Search brands, vouchers..."
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