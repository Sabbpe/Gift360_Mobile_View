import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCoins } from "@/components/FloatingCoins";
import { apiBrands } from "@/data/brands";
import { Zap, ShoppingCart } from "lucide-react";
import { useMemo } from "react";
import { useLocation } from "wouter";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";

export default function Offers() {
  const [, setLocation] = useLocation();

  const hotDealBrands = useMemo(() => {
    return apiBrands
      .filter((brand) => brand.Discount && parseFloat(brand.Discount) > 0)
      .sort(
        (a, b) =>
          parseFloat(b.Discount || "0") - parseFloat(a.Discount || "0")
      )
      .slice(0, 12);
  }, []);

  const handleBrandClick = (brandCode: string) => {
    setLocation(`/brands/${brandCode}`);
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Aurora backdrop */}
      <div className="absolute inset-0 bg-hero-aurora">
        <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute top-1/3 -right-24 w-96 h-96 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>
      <FloatingCoins />

      <div className="relative flex flex-col flex-1">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <div className="border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <span className="absolute -inset-[3px] rounded-2xl bg-gold-gradient blur-[2px] opacity-80" />
                  <div className="relative p-2.5 rounded-2xl bg-blackcard card-edge">
                    <Zap className="h-7 w-7 text-amber-300" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold">
                    <span className="text-gold-gradient">Hot Deals</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400/10 text-amber-300 text-xs font-semibold rounded-md border border-amber-400/30">
                      <Zap className="h-3 w-3" />
                      Limited Time
                    </span>
                    <span className="text-sm text-white/60">
                      {hotDealBrands.length} exclusive offers
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-white/70">
                Don't miss out! Grab the highest discount vouchers available right now.
              </p>
            </div>
          </div>

          {/* Deals Grid */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {hotDealBrands.length === 0 ? (
              <div className="text-center py-16 rounded-3xl bg-blackcard card-edge">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/5 mb-4">
                  <Zap className="h-7 w-7 text-amber-300" />
                </div>
                <h3 className="text-lg font-extrabold mb-1"><span className="text-gold-gradient">No Hot Deals Available</span></h3>
                <p className="text-sm text-white/60">
                  Check back soon for exciting offers!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {hotDealBrands.map((brand, index) => (
                  <div
                    key={brand.BrandCode}
                    className="group cursor-pointer"
                    onClick={() => handleBrandClick(brand.BrandCode)}
                    style={{
                      animation: `fadeIn 0.4s ease-out ${index * 0.03}s both`,
                    }}
                  >
                    <div className="relative overflow-hidden rounded-3xl bg-blackcard card-edge hover:border-amber-400/40 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/10 h-full flex flex-col">

                      {/* Discount Badge */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gold-gradient text-amber-950 text-xs font-bold rounded-md shadow-md shadow-amber-500/30">
                          <Zap className="h-3 w-3 fill-amber-950" />
                          {parseFloat(brand.Discount || "0").toFixed(1)}% OFF
                        </span>
                      </div>

                      {/* Image */}
                      <div className="relative h-40 overflow-hidden bg-white/5">
                        {getImageUrl(brand) ? (
                          <img
                            src={getImageUrl(brand) || FALLBACK_IMAGE}
                            alt={brand.BrandName}
                            className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = FALLBACK_IMAGE;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="h-12 w-12 text-white/20" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3.5 flex-1 flex flex-col">
                        {/* Category */}
                        {brand.Category && (
                          <span className="inline-flex self-start items-center px-2 py-0.5 mb-2 text-xs font-medium rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                            {brand.Category}
                          </span>
                        )}

                        {/* Brand Name */}
                        <h3 className="text-sm font-bold mb-1.5 line-clamp-2 min-h-[2.5rem] text-white group-hover:text-amber-300 transition-colors">
                          {brand.BrandName}
                        </h3>

                        {/* Description */}
                        {brand.Description && (
                          <p className="text-xs text-white/50 mb-2.5 line-clamp-2 flex-1">
                            {brand.Description}
                          </p>
                        )}

                        {/* Price Range */}
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/10 mb-2.5">
                          <div>
                            <p className="text-[10px] text-white/40 mb-0.5">
                              Price Range
                            </p>
                            <p className="text-xs font-semibold text-white">
                              ₹{brand.minPrice} - ₹{brand.maxPrice}
                            </p>
                          </div>
                          {brand.Brandtype && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/70 font-medium">
                              {brand.Brandtype}
                            </span>
                          )}
                        </div>

                        {/* Button */}
                        <button className="w-full py-2 px-3 rounded-xl bg-gold-gradient text-amber-950 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-110 active:scale-95">
                          Grab This Deal
                          <svg
                            className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <Footer />
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
