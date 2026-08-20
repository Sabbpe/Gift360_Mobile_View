import { useMemo } from "react";
import type { Brand } from "@/types/brand";
import type { CartBrandEntry } from "@/data/recentlyBought";
import { getImageUrl } from "@/utils/imageUrl";
import { isSuperCoinExcludedById, isSuperCoinExcluded } from "@/lib/supercoin-excluded-brands";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

export type MatchedBrand = Brand & { cartMeta: CartBrandEntry };

interface WhatsHotSectionProps {
  brands: MatchedBrand[];
  onOpenBrand: (brandId: string) => void;
}

const TOP_BRANDSRowCount = 20;

function formatPurchases(count: number): string | null {
  if (count < 1000) return null;
  const k = count / 1000;
  return k % 1 === 0 ? `${k}k+ bought` : `${k.toFixed(1)}k+ bought`;
}

export default function WhatsHotSection({ brands, onOpenBrand }: WhatsHotSectionProps) {
  const topRow = useMemo(() => {
    const first = brands.filter((_, i) => i % 2 === 0);
    return first.length > 0 ? [...first, ...first] : [];
  }, [brands]);

  const bottomRow = useMemo(() => {
    const second = brands.filter((_, i) => i % 2 === 1);
    const source = second.length > 0 ? second : brands;
    return source.length > 0 ? [...source, ...source] : [];
  }, [brands]);

  const topDuration = Math.round((topRow.length / 2 / TOP_BRANDSRowCount) * 200);
  const bottomDuration = Math.round((bottomRow.length / 2 / TOP_BRANDSRowCount) * 220);

  if (!brands.length) return null;

  const renderCard = (brand: MatchedBrand, index: number) => {
    const imageSrc = getImageUrl(brand) || null;
    const badge = formatPurchases(brand.cartMeta.recentPurchases);

    return (
      <button
        key={`${brand.BrandId}-${index}`}
        onClick={() => onOpenBrand(brand.BrandId)}
        className="flex h-[96px] min-w-[88px] flex-shrink-0 cursor-pointer flex-col items-center justify-center rounded-[12px] bg-white px-[10px] py-[12px] text-center shadow-[0_4px_10px_rgba(0,0,0,0.05)] active:scale-[0.98] relative"
      >
        {!isSuperCoinExcludedById(brand.BrandId) && !isSuperCoinExcluded(brand.BrandName) && (
          <img src={superCoinImg} alt="SuperCoin" className="absolute top-1.5 right-1.5 w-[16px] h-[16px] object-contain drop-shadow-sm z-10" />
        )}
        <div className="grid h-[40px] w-[40px] place-items-center bg-white rounded-lg">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={brand.BrandName}
              className="h-[40px] w-[40px] object-contain"
            />
          ) : (
            <div className="h-[40px] w-[40px] bg-[#f5f5f5] rounded-lg" />
          )}
        </div>
        <div className="mt-1.5 w-full">
          <p className="line-clamp-1 text-[10px] font-medium leading-[1.1] text-[#101010]">
            {brand.BrandName}
          </p>
          {badge && (
            <span className="mt-1 inline-block rounded-full bg-[#7C3AED]/10 px-1.5 py-px text-[7px] font-semibold text-[#7C3AED]">
              {badge}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <section className="px-[21px] pt-[26px]">
      <div className="flex items-center justify-between">
        <div className="inline-block bg-white rounded-xl px-3 py-1">
          <h2 className="text-[17px] font-bold leading-none tracking-[-0.02em] text-black">
            Rakhi Special Picks
          </h2>
        </div>
        <span className="text-[10px] font-medium text-[#7C3AED] bg-[#F3F0FF] px-2 py-0.5 rounded-full">
          Live
        </span>
      </div>

      <div className="marquee-mask mt-[11px] overflow-hidden">
        <div
          className="flex w-max gap-3 pb-3 anim-marquee-ltr"
          style={{ animationDuration: `${topDuration}s` }}
        >
          {topRow.map(renderCard)}
        </div>
        <div
          className="mt-3 flex w-max gap-3 anim-marquee-rtl"
          style={{ animationDuration: `${bottomDuration}s` }}
        >
          {bottomRow.map(renderCard)}
        </div>
      </div>
    </section>
  );
}
