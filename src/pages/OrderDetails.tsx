// pages/OrderDetailPage.tsx
import { useRoute, Link } from "wouter";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FloatingCoins } from "@/components/FloatingCoins";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScratchCard } from "@/components/ScratchCard";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  CreditCard,
  Gift,
} from "lucide-react";
import { format } from "date-fns";
import { getVoucherState } from "@/types/order";

const FALLBACK_IMAGE = "/brand-placeholder.png";

// Image validation
async function validateImage(url: string): Promise<string> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject();
      img.src = url;
      setTimeout(() => reject(), 3000);
    });
  } catch {
    return FALLBACK_IMAGE;
  }
}

// Image component
function BrandImage({ src, alt }: { src?: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(FALLBACK_IMAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadImage() {
      if (!src || src === FALLBACK_IMAGE) {
        setIsLoading(false);
        return;
      }

      try {
        const validatedUrl = await validateImage(src);
        if (isMounted) setImgSrc(validatedUrl);
      } catch {
        if (isMounted) setImgSrc(FALLBACK_IMAGE);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadImage();
    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
      {isLoading ? (
        <div className="animate-pulse bg-neutral-200 dark:bg-neutral-600 w-full h-full" />
      ) : (
        <img
          src={imgSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
        />
      )}
    </div>
  );
}

export default function OrderDetails() {
  const [, params] = useRoute("/orders/:orderId");
  const orderId = (params as any)?.orderId;
  const { user } = useAuthContext();
  const { data, isLoading } = useOrders(user?.clientId);

  const order = data?.orders.find((o) => o.order_id === orderId);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30";
      case "PAID":
      case "SUCCESS":
      case "COMPLETED":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30";
      case "FAILED":
      case "CANCELLED":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
      case "TAMPERED":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "PAID":
      case "SUCCESS":
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "FAILED":
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "TAMPERED":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getImageUrl = (meta: any): string => {
    if (!meta || !meta.images) return FALLBACK_IMAGE;

    try {
      const images =
        typeof meta.images === "string" ? JSON.parse(meta.images) : meta.images;
      return (
        images.text ||
        images.raw ||
        images.thumbnail ||
        images.featured ||
        FALLBACK_IMAGE
      );
    } catch {
      return FALLBACK_IMAGE;
    }
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-hero-aurora">
          <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        </div>
        <div className="relative flex flex-col flex-1">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400/30 border-t-amber-400"></div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="relative min-h-screen flex flex-col overflow-hidden">
        <div className="absolute inset-0 bg-hero-aurora">
          <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
        </div>
        <div className="relative flex flex-col flex-1">
          <Header />
          <main className="flex-1 flex items-center justify-center px-4">
            <div className="text-center space-y-6 rounded-3xl bg-blackcard card-edge p-8 max-w-md">
              <Package className="h-20 w-20 mx-auto text-amber-300/60" />
              <div>
                <h1 className="text-3xl font-extrabold mb-2"><span className="text-gold-gradient">Order Not Found</span></h1>
                <p className="text-white/60">
                  This order doesn't exist or you don't have access
                </p>
              </div>
              <Link href="/orders">
                <button className="h-11 px-6 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                  Back to Orders
                </button>
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.created_at);
  const isPaid =
    order.status.toUpperCase() === "PAID" ||
    order.status.toUpperCase() === "SUCCESS";

  // ✅ Calculate total coupons
  const totalCoupons = order.items.reduce((total, item) => {
    if (
      item.coupons &&
      item.coupons.length > 0 &&
      item.coupons[0]?.vd_raw_response?.brand_details?.[0]?.items
    ) {
      return (
        total + item.coupons[0].vd_raw_response.brand_details[0].items.length
      );
    }
    return total;
  }, 0);

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
          {/* Header */}
          <div className="border-b border-white/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
              <Link href="/orders">
                <button className="mb-4 inline-flex items-center gap-2 text-white/60 hover:text-amber-300 transition-colors text-sm font-medium group">
                  <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Orders
                </button>
              </Link>

              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-extrabold">
                    <span className="text-gold-gradient">Order Details</span>
                  </h1>
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-white/70">
                      Order #{order.order_number}
                    </p>
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(
                        order.status
                      )} flex items-center gap-1`}
                    >
                      {getStatusIcon(order.status)}
                      {order.status}
                    </Badge>
                    {totalCoupons > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-400/10 text-amber-300 border-amber-400/30"
                      >
                        <Gift className="h-3 w-3 mr-1" />
                        {totalCoupons} Voucher{totalCoupons > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                </div>

                {order.status === "PENDING" && (
                  <button className="h-12 px-6 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                    Complete Payment
                  </button>
                )}
                {order.status.toUpperCase() === "TAMPERED" && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                      Please write to <span className="font-bold">gift360@gift360.io</span> regarding this order.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Content */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items with Coupons */}
              {order.items.map((item) => {
                const brandName =
                  item.meta && "brand_name" in item.meta
                    ? item.meta.brand_name
                    : `Brand ${item.brand_id.slice(0, 8)}`;
                const imageUrl = getImageUrl(item.meta);
                const category =
                  item.meta && "category" in item.meta
                    ? item.meta.category
                    : "";

                const hasCoupons = item.coupons && item.coupons.length > 0;
                 const couponItems = hasCoupons && item.coupons?.[0]?.vd_raw_response?.brand_details?.[0]?.items
                  ? item.coupons[0].vd_raw_response.brand_details[0].items
                  : [];

                return (
                  <Card key={item.order_item_id} className="overflow-hidden bg-blackcard card-edge border-0 text-white rounded-3xl">
                    <CardHeader className="bg-white/5">
                      <div className="flex items-center gap-4">
                        <BrandImage src={imageUrl} alt={brandName} />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-white">{brandName}</h3>
                          <p className="text-sm text-white/60">
                            {category}
                          </p>
                          <p className="text-sm text-white/60 mt-1">
                            Quantity: {item.quantity} × ₹
                            {item.unit_value.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-extrabold text-xl text-gold-gradient">
                          ₹{item.line_total.toFixed(2)}
                        </p>
                      </div>
                    </CardHeader>

                    {/* ✅ Coupons Section with Scratch Cards */}
                    {hasCoupons && isPaid && (
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-lg flex items-center gap-2 text-white">
                              <Gift className="h-5 w-5 text-amber-300" />
                              Your Gift Vouchers ({couponItems.length})
                            </h4>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            {couponItems.map((coupon, idx) => (
                              <ScratchCard
                                key={idx}
                                cardNumber={coupon.getCardNo}
                                cardPin={coupon.getCardPin}
                                expiryDate={coupon.getExpiryDate}
                                amount={coupon.balanceTotal}
                                brandName={brandName}
                                index={idx}
                                orderItemId={item.order_item_id}
                                clientId={user?.clientId ?? ""}
                                orderNumber={order.order_number}
                                initialState={getVoucherState(item)}
                              />
                            ))}
                          </div>

                          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              💡 <strong>Tip:</strong> Scratch the cards above
                              to reveal your voucher codes. Screenshot or note
                              them down for later use!
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    )}

                    {/* No coupons message for paid orders */}
                    {!hasCoupons && isPaid && (
                      <CardContent className="p-6">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            ⏳ Vouchers are being generated. Please check back
                            in a few moments.
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card className="bg-blackcard card-edge border-0 text-white rounded-3xl">
                <CardHeader>
                  <h2 className="font-extrabold"><span className="text-gold-gradient">Order Summary</span></h2>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Subtotal</span>
                      <span className="text-white">₹{order.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/60">Processing Fee</span>
                      <span className="text-white">₹0.00</span>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-white">Total</span>
                    <span className="text-gold-gradient text-2xl font-extrabold">
                      ₹{order.total_amount.toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card className="bg-blackcard card-edge border-0 text-white rounded-3xl">
                <CardHeader>
                  <h2 className="font-extrabold"><span className="text-gold-gradient">Order Information</span></h2>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-amber-300" />
                    <div>
                      <p className="text-white/60">Order Date</p>
                      <p className="font-medium text-white">
                        {format(orderDate, "MMM dd, yyyy · hh:mm a")}
                      </p>
                    </div>
                  </div>

                  {order.paid_at && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-300" />
                      <div>
                        <p className="text-white/60">Payment Date</p>
                        <p className="font-medium text-white">
                          {format(new Date(order.paid_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-amber-300" />
                    <div>
                      <p className="text-white/60">Total Items</p>
                      <p className="font-medium text-white">
                        {order.items.length} item
                        {order.items.length > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  {totalCoupons > 0 && (
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-amber-300" />
                      <div>
                        <p className="text-white/60">Gift Vouchers</p>
                        <p className="font-medium text-white">
                          {totalCoupons} voucher{totalCoupons > 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </div>
  );
}
