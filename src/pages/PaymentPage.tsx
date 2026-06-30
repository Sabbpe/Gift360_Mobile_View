import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useInitiatePayment } from "@/hooks/useInitiatePayment";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import OrderSummary from "@/components/OrderSummary";
import { ChevronLeft } from "lucide-react";
import payOnSabbpe from "@/assets/payonsabbpe.png";
import { getImageUrl, FALLBACK_IMAGE } from "@/utils/imageUrl";

interface CartItem {
  itemId: string;
  brandId: string;
  brandName: string;
  quantity: number;
  unitValue: number;
  lineTotal: number;
  image?: string;
}

interface LocationState {
  cartItems: CartItem[];
  totalAmount: number;
}

const FALLBACK = FALLBACK_IMAGE;

async function validateImage(url: string): Promise<string> {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => reject();
      img.src = url;
      setTimeout(() => reject(), 5000);
    });
  } catch {
    return FALLBACK;
  }
}

export default function PaymentPage() {
  const [, navigate] = useLocation();
  const location = useLocation()[1];
  const { user } = useAuthContext();
  const { toast } = useToast();
  const createOrderMutation = useCreateOrder();
  const initiatePaymentMutation = useInitiatePayment();
  const [isProcessing, setIsProcessing] = useState(false);

  // Get state from navigation
  const state = location?.state as LocationState | undefined;
  const cartItems = state?.cartItems || [];
  const totalAmount = state?.totalAmount || 0;

  useEffect(() => {
    if (!state) {
      toast({
        description: "Invalid payment session. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => navigate("/cart"), 1500);
    }
  }, [state, navigate, toast]);

  const handlePayWithSabbpe = async () => {
    if (!user?.clientId) {
      toast({
        description: "Please login to continue",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        description: "Your cart is empty",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create order first
      const order = await createOrderMutation.mutateAsync({
        clientId: user.clientId,
        items: cartItems.map((item) => ({
          brandId: item.brandId,
          quantity: item.quantity,
          unitValue: item.unitValue,
        })),
        totalAmount,
      });

      // Initiate payment
      await initiatePaymentMutation.mutateAsync({
        amount: totalAmount,
        productinfo: cartItems.map((i) => i.brandName).join(", "),
        frontendUrl: window.location.origin,
        customer: {
          firstname: user.name || "Customer",
          email: user.email || "",
          phone: user.phone || "",
        },
        merchantOrderRef: order.orderNumber,
      });
    } catch (error) {
      toast({
        description: "Payment initiation failed. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* Back Button */}
      <div className="border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Cart
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {!state ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading payment details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Order Title */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Order Summary
              </h1>
              <p className="text-gray-600">
                Review your items before payment
              </p>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.itemId}
                  className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  {/* Brand Image */}
                  <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <img
                      src={getImageUrl(item) || FALLBACK_IMAGE}
                      alt={item.brandName}
                      className="w-12 h-12 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK;
                      }}
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {item.brandName}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      ₹{item.unitValue.toLocaleString()} × {item.quantity}
                    </p>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-bold text-purple-600">
                      ₹{item.lineTotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <OrderSummary
              itemTotal={totalAmount}
              processingFee={0}
              discount={0}
              totalAmount={totalAmount}
            />

            {/* Payment Button */}
            <button
              onClick={handlePayWithSabbpe}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white py-4 text-lg font-bold text-[#111827] shadow-sm transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#111827] border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  <img
                    src={payOnSabbpe}
                    alt="Pay on SabbPe"
                    className="h-6 object-contain"
                  />
                  Pay with SabbPe
                </>
              )}
            </button>

            {/* Security Info */}
            <div className="text-center text-sm text-gray-500">
              <p>🔒 Your payment information is secure and encrypted</p>
            </div>
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
