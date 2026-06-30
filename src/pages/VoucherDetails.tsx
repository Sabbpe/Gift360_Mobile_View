import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import Header from "@/components/Header";
import VoucherCard from "@/components/VoucherCard";
import Footer from "@/components/Footer";
import { vouchers } from "@/data/vouchers";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Tag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FloatingCoins } from "@/components/FloatingCoins";

export default function VoucherDetails() {
  const [, params] = useRoute("/voucher/:id");
  const [, navigate] = useLocation();
  const voucher = vouchers.find((v) => v.id === (params as any)?.id);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);

  const { user } = useAuthContext();
  const { addToCart } = useCart(user?.clientId);
  const { toast } = useToast();

  if (!voucher) {
    return (
      <div className="min-h-screen flex flex-col bg-hero-aurora">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <FloatingCoins count={6} />
          <div className="relative text-center bg-blackcard card-edge rounded-3xl px-8 py-10">
            <h1 className="text-2xl font-bold mb-2 text-gold-gradient">Voucher Not Found</h1>
            <p className="text-sm sm:text-base text-white/65">
              The voucher you're looking for doesn't exist.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const handleAddToCart = () => {
    const price = voucher.prices[selectedPrice];
    addToCart({
      brandId: voucher.id,
      brandName: voucher.title,
      quantity: 1,
      unitValue: price,
      image: voucher.image,
    });

    toast({
      title: "Added to cart",
      description: `${voucher.title} ($${price}) has been added to your cart.`,
    });

    // Navigate to cart page
    setTimeout(() => navigate("/cart"), 500);
  };

  const suggestedVouchers = vouchers
    .filter((v) => v.id !== voucher.id && v.category === voucher.category)
    .slice(0, 4);

  return (
    <div className="min-h-screen flex flex-col bg-hero-aurora">
      <Header />

      <main className="flex-1 relative">
        <FloatingCoins count={6} />
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-10 lg:gap-12">
            {/* IMAGE */}
            <div className="space-y-4 sm:space-y-6">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-blackcard card-edge p-3">
                <img
                  src={voucher.image}
                  alt={voucher.title}
                  className="w-full h-full object-cover rounded-2xl"
                />

                {voucher.discount && (
                  <span className="absolute top-5 right-5 bg-gold-gradient text-amber-950 text-sm font-extrabold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-soft">
                    <Tag className="h-4 w-4" />
                    {voucher.discount}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* DETAILS */}
            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-xs sm:text-sm text-amber-300 mb-2 uppercase tracking-wider font-semibold">
                  {voucher.brand}
                </p>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-3 sm:mb-4 text-gold-gradient">
                  {voucher.title}
                </h1>

                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-300 text-amber-300" />
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {voucher.rating}
                    </span>
                  </div>
                  <span className="text-xs sm:text-sm text-white/60">
                    ({voucher.reviewCount} reviews)
                  </span>
                </div>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed">
                  {voucher.description}
                </p>
              </div>

              {/* PRICE CARD */}
              <div className="bg-blackcard card-edge rounded-3xl p-5 lg:p-6 space-y-5">
                <div>
                  <label className="text-xs sm:text-sm font-bold mb-3 block text-white/70 uppercase tracking-wider">
                    Select Amount
                  </label>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {voucher.prices.map((price, index) => {
                      const active = selectedPrice === index;
                      return (
                        <button
                          key={price}
                          onClick={() => setSelectedPrice(index)}
                          className={`h-11 sm:h-12 rounded-xl text-sm sm:text-base font-bold transition-all border ${
                            active
                              ? "bg-gold-gradient text-amber-950 border-amber-300 shadow-soft"
                              : "bg-white/5 text-white border-white/15 hover:bg-white/10"
                          }`}
                        >
                          ${price}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-5">
                  <div className="flex items-baseline justify-between mb-4">
                    <span className="text-xs sm:text-sm text-white/60 uppercase tracking-wider font-semibold">
                      Price
                    </span>
                    <span className="text-3xl font-extrabold text-gold-gradient">
                      ${voucher.prices[selectedPrice]}
                    </span>
                  </div>

                  <Button
                    size="lg"
                    onClick={handleAddToCart}
                    className="w-full rounded-full h-12 text-sm sm:text-base font-bold bg-gold-gradient text-amber-950 hover:opacity-90 shadow-soft"
                  >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {suggestedVouchers.length > 0 && (
            <section className="mt-12 sm:mt-16 lg:mt-20">
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-6 sm:mb-8 text-gold-gradient">
                You May Also Like
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
                {suggestedVouchers.map((v) => (
                  <VoucherCard key={v.id} voucher={v} />
                ))}
              </div>
            </section>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
