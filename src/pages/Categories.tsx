import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from "wouter";
import { useFilterMeta } from '@/hooks/useFilterMeta';
import { useBrands } from '@/hooks/useBrands';
import CategorySection from '@/components/CategorySection';
import Header from '@/components/Header';
import PaymentDetailsSheet from '@/components/PaymentDetailsSheet';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function Categories() {
  const [, setLocation] = useLocation();
  const { data: filterMeta } = useFilterMeta();
  const { data: brandsRaw = [] } = useBrands();

  const brands = Array.isArray(brandsRaw) ? brandsRaw : [];

  const categoryNames = filterMeta?.categories && filterMeta.categories.length ? filterMeta.categories : Array.from(new Set(brands.map((b: any) => b.Category).filter(Boolean))).sort();

  const categoryMap = useMemo(() => {
    return categoryNames.map((category: string) => ({
      name: category,
      items: brands.filter((brand: any) => (brand.Category || brand.category || '') === category),
    }));
  }, [brands, categoryNames]);
  const [buySheetOpen, setBuySheetOpen] = useState(false);
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);

  return (
    <>
      <Header />
      <main className="min-h-screen w-full bg-gradient-to-b from-purple-50 to-white pb-24" style={{ background: "linear-gradient(179.64deg, #9747FF -354.99%, #FFFFFF 99.68%)" }}>
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
        <h1 className="font-semibold text-lg absolute left-1/2 -translate-x-1/2">Categories</h1>
        <div className="w-10 h-10" />
      </header>

      <div className="px-4 pt-6 space-y-6">
        {categoryMap.map((section) => (
          <CategorySection key={section.name} title={section.name} items={section.items} onBuy={(id: string) => { setSheetBrandId(id); setBuySheetOpen(true); }} />
        ))}
      </div>

      <PaymentDetailsSheet brandId={sheetBrandId} open={buySheetOpen} onClose={() => setBuySheetOpen(false)} />
      <MobileBottomNav />
      </main>
    </>
  );
}
