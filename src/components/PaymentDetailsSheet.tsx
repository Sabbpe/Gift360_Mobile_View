import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { useBrandDetails } from "@/hooks/useBrandDetails";
import { useAuthContext } from "@/contexts/AuthContext";
import { useCart } from "@/hooks/useCart";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useCreateOrder } from "@/hooks/useCreateOrder";
import { useValidateOrder } from "@/hooks/useValidateOrder";
import { useBackendPaymentInitiation } from "@/hooks/useBackendPaymentInitiation";
import payOnSabbpe from "@/assets/payonsabbpe.png";
import AddToCartSuccessModal from "@/components/AddToCartSuccessModal";
import type { BrandDetailsParsed } from "@/types/brandDetails";
import { useNotification } from "@/contexts/NotificationContext";
import { getImageUrl } from "@/utils/imageUrl";

const MAX_QUANTITY_PER_ITEM = 3;

type Props = {
  brandId?: string | null;
  open: boolean;
  onClose: () => void;
  showAddToCart?: boolean;
  initialAmount?: number;
  initialQuantity?: number;
  initialBrandDetails?: BrandDetailsParsed | null;
  initialTab?: "about" | "how" | "terms" | null;
};

export default function PaymentDetailsSheet({
  brandId,
  open,
  onClose,
  showAddToCart = true,
  initialAmount,
  initialQuantity,
  initialBrandDetails,
  initialTab = null,
}: Props) {
  const cashbackPercent = 15;
  const { data: fetchedBrand } = useBrandDetails(brandId || "", {
    enabled: !!brandId && open && !initialBrandDetails,
  });
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);
  const [amount, setAmount] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<null | "about" | "how" | "terms">(
    null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuthContext();
  const { addToCart, clearCart } = useCart(user?.clientId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { addNotification } = useNotification();

  const createOrderMutation = useCreateOrder();
  const validateOrderMutation = useValidateOrder();
  const backendPaymentMutation = useBackendPaymentInitiation();
  const brand = initialBrandDetails || fetchedBrand;

  const isFixedType = brand?.BrandType?.toLowerCase() === "fixed";
  const discountPercent = Number(brand?.Discount) || cashbackPercent;
  const min = Number(brand?.minPrice) || brand?.DenominationList?.[0] || 1000;
  const max =
    Number(brand?.maxPrice) ||
    brand?.DenominationList?.[brand.DenominationList.length - 1] ||
    min;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!brand) return;

    if (typeof initialQuantity === "number" && initialQuantity > 0) {
      setQuantity(initialQuantity);
    }

    if (typeof initialAmount === "number" && initialAmount > 0) {
      const clampedAmount = Math.max(min, Math.min(max, initialAmount));
      setAmount(clampedAmount);
      return;
    }

    if (
      brand.BrandType?.toLowerCase() === "fixed" &&
      brand.DenominationList?.length
    ) {
      setAmount(brand.DenominationList[0]);
    } else {
      setAmount(min);
    }
  }, [brand, min, max, initialAmount, initialQuantity]);

  useEffect(() => {
    let timeoutId: number | undefined;

    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setIsVisible(false);
      document.body.style.overflow = "auto";
      timeoutId = window.setTimeout(() => setIsMounted(false), 300);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const sliderPercent = max > min ? ((amount - min) / (max - min)) * 100 : 0;

  const handleSheetClose = () => {
    onClose();
  };

  const handleAddToCart = () => {
    if (!brand) return;

    addToCart({
      brandId: brand.BrandId,
      brandName: brand.BrandName,
      quantity,
      unitValue: amount,
      image: getImageUrl(brand) || undefined,
    });

    addNotification({
      title: "Added to Cart",
      message: `${brand.BrandName} voucher has been added successfully into cart`,
      type: "success",
    });

    setShowSuccess(true);

    window.setTimeout(() => {
      setShowSuccess(false);
      handleSheetClose();
      navigate("/cart?tab=cart");
    }, 2200);
  };

  const handlePay = async () => {
    if (!brand || !user?.clientId) {
      toast({
        description: "Please login to continue payment",
        variant: "destructive",
      });
      window.setTimeout(() => navigate("/login"), 1500);
      return;
    }

    setIsProcessing(true);

    try {
      const lineTotal = amount * quantity;
      const today = new Date();
      const yymmdd =
        today.getFullYear().toString().slice(-2) +
        String(today.getMonth() + 1).padStart(2, "0") +
        String(today.getDate()).padStart(2, "0");
      const uuid = window.crypto.randomUUID();
      const orderNumber =
        "ORD" + yymmdd + uuid.replace(/-/g, "").slice(0, 12).toUpperCase();

      const orderRequest = {
        order: {
          clientId: user.clientId,
          orderNumber,
          totalAmount: lineTotal,
          currency: "INR",
          status: "PENDING",
        },
        items: [
          {
            brandId: brand.BrandId,
            quantity,
            unitValue: amount,
            lineTotal,
            meta: "{}",
          },
        ],
      };

      const orderResponse = await createOrderMutation.mutateAsync(orderRequest);
      console.log("Order created:", orderResponse);

      validateOrderMutation.mutate(
        {
          orderNumber: orderResponse.orderNumber,
          cartTotal: lineTotal,
          walletAmount: 0,
          walletUsed: false,
        },
        {
          onSuccess: (validationResponse) => {
            console.log("Validation response:", validationResponse);

            if (!validationResponse.valid) {
              toast({
                title: "Validation Failed",
                description: validationResponse.message,
                variant: "destructive",
              });
              setIsProcessing(false);
              return;
            }

            backendPaymentMutation.mutate(orderResponse.orderNumber, {
              onSuccess: (response) => {
                console.log("Backend payment initiation response:", response);

                const isSuccess =
                  response.status === 1 || response.status === true;
                const paymentUrl =
                  response.payment_url ||
                  response.paymentUrl ||
                  response.data;

                if (!isSuccess || !paymentUrl) {
                  toast({
                    title: "Payment initiation failed",
                    description:
                      response.message || "Unable to initiate payment",
                    variant: "destructive",
                  });
                  setIsProcessing(false);
                  return;
                }

                try {
                  if (!user?.clientId) {
                    localStorage.removeItem("guestCart");
                  } else {
                    clearCart();
                  }
                } catch (e) {
                  console.warn("Failed to clear cart before redirect", e);
                }

                window.location.href = paymentUrl;
              },
              onError: (error: any) => {
                console.error("Payment initiation error:", error);
                toast({
                  title: "Payment error",
                  description: error.message || "Failed to initiate payment",
                  variant: "destructive",
                });
                setIsProcessing(false);
              },
            });
          },
          onError: (error: any) => {
            console.error("Validation error:", error);
            toast({
              title: "Validation Failed",
              description: error.message || "Failed to validate order",
              variant: "destructive",
            });
            setIsProcessing(false);
          },
        }
      );
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  const aboutContent = brand?.Description || "No description available.";
  const termsContent =
    typeof brand?.Tnc === "string"
      ? brand.Tnc
      : Object.values(brand?.Tnc || {}).join("\n") || "No terms available.";

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="overlay"
        onClick={handleSheetClose}
        style={{
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? "auto" : "none",
          transition: "opacity 0.28s ease",
        }}
      />

      <div className="sheet-wrapper">
        <section
          className={`sheet ${isVisible ? "sheet-open" : "sheet-closing"}`}
          aria-modal="true"
          role="dialog"
        >
          <style>{`
            .overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0,0,0,0.3);
              backdrop-filter: blur(4px);
              -webkit-backdrop-filter: blur(4px);
              z-index: 10;
            }
            .sheet-wrapper {
              position: fixed;
              bottom: 63px;
              left: 0;
              width: 100%;
              display: flex;
              justify-content: center;
              z-index: 20;
              pointer-events: none;
            }
            .sheet {
              position: relative;
              width: 100%;
              max-width: 390px;
              height: 600px;
              background: #F3F5F9;
              border-top-left-radius: 50px;
              border-top-right-radius: 50px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              box-shadow: 0px -4px 20px rgba(0,0,0,0.2);
              pointer-events: auto;
            }
            .sheet-open {
              animation: slideUp 0.4s ease forwards;
            }
            .sheet-closing {
              animation: slideDown 0.28s ease forwards;
            }
            .sheet-header {
              position: relative;
              display: flex;
              align-items: center;
              gap: 8px;
              min-height: 72px;
              padding: 20px 16px 10px;
              color: #3E3E3E;
              font-family: Poppins, sans-serif;
              font-size: 14px;
              font-style: normal;
              font-weight: 500;
              line-height: 21px;
              z-index: 2;
            }
            .drag-handle {
              position: absolute;
              left: 50%;
              top: 12px;
              width: 100px;
              height: 10px;
              transform: translateX(-50%);
              border-radius: 10px;
              background: #D9D9D9;
            }
            .sheet-back-button {
              width: 24px;
              height: 24px;
              display: grid;
              place-items: center;
              flex-shrink: 0;
              z-index: 3;
            }
            .sheet-content {
              flex: 1;
              overflow-y: auto;
              overflow-x: hidden;
              padding: 8px 16px 76px;
              scroll-behavior: smooth;
            }
            .sheet-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              background: #F3F5F9;
              padding: 8px 16px 12px;
              box-shadow: 0 -4px 10px rgba(0,0,0,0.08);
              z-index: 3;
            }
            .top-card {
              position: relative;
              margin: 0 auto;
              width: 342px;
              height: 86px;
              box-shadow: 0px 6px 20px rgba(0,0,0,0.15);
              border-radius: 10px;
              background: #FFFFFF;
            }
            .amount-box {
              margin: 6px auto 6px;
              width: 342px;
            }
            .quantity-box {
              margin-top: 10px;
              margin-bottom: 10px;
            }
            .info-section {
              margin-top: 24px;
              margin-bottom: 8px;
            }
            .payment-range {
              -webkit-appearance: none;
              appearance: none;
              width: 100%;
              height: 10px;
              border-radius: 10px;
              outline: none;
              background: #DAD5FF;
            }
            .payment-range::-webkit-slider-runnable-track {
              height: 10px;
              border-radius: 10px;
              background: transparent;
            }
            .payment-range::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #6C5CE7;
              border: 1px solid #FFFFFF;
              margin-top: -2.5px;
              box-shadow: 0 1px 3px rgba(0,0,0,0.22);
            }
            .payment-range::-moz-range-track {
              height: 10px;
              border-radius: 10px;
              background: #DAD5FF;
            }
            .payment-range::-moz-range-progress {
              height: 10px;
              border-radius: 10px;
              background: linear-gradient(90deg, #9747FF, #5B2B99);
            }
            .payment-range::-moz-range-thumb {
              width: 15px;
              height: 15px;
              border-radius: 50%;
              background: #6C5CE7;
              border: 1px solid #FFFFFF;
              box-shadow: 0 1px 3px rgba(0,0,0,0.22);
            }
            .amount-bubble::after {
              content: "";
              position: absolute;
              left: 50%;
              bottom: -6px;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 6px solid #2F80ED;
            }
            .expandable {
              max-height: 0;
              overflow: hidden;
              transition: max-height 0.3s ease;
            }
            .expandable.open {
              max-height: 300px;
              overflow-y: auto;
            }
            .bottom-bar {
              width: 342px;
              margin: 0 auto;
            }
            .cta-inner {
              display: flex;
              gap: 12px;
              justify-content: space-between;
              align-items: center;
              box-shadow: 0px 4px 12px rgba(0,0,0,0.12);
              padding: 10px 12px;
              border-radius: 10px;
            }
            .cta-inner > button {
              flex: 1;
              min-width: 0;
            }
            .cta-gradient {
              background: linear-gradient(90deg, #9747FF 0%, #5B2B99 100%);
              color: white;
            }
            .pay-text {
              color: #9747FF;
              font-family: Poppins, sans-serif;
              font-weight: 600;
              font-size: 14px;
              line-height: 20px;
            }
            .pay-btn {
              min-width: 130px;
              height: 42px;
              border-radius: 12px;
              background: #ffffff;
              border: 1px solid #E5E7EB;
              cursor: pointer;
              box-shadow: 0px 4px 12px rgba(17, 24, 39, 0.08);
              padding: 0 12px;
            }
            .pay-btn:hover {
              background: #FCFCFD;
            }
            .pay-btn:disabled {
              background: #E0E0E0;
              color: #9E9E9E;
              border-color: #D1D5DB;
              cursor: not-allowed;
              box-shadow: none;
              opacity: 1;
            }
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes slideDown {
              from { transform: translateY(0); }
              to { transform: translateY(100%); }
            }
          `}</style>

          <div className="sheet-header">
            <span className="drag-handle" />
            <button
              onClick={handleSheetClose}
              aria-label="Back"
              className="sheet-back-button"
            >
              <ChevronLeft className="h-6 w-6 text-black" strokeWidth={2.2} />
            </button>
            <span>Payment Details</span>
          </div>

          <div className="sheet-content">
            <div className="top-card overflow-hidden">
              <div className="flex h-full items-center gap-3 p-3">
                <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F3F4F6]">
                  <img
                    src={getImageUrl(brand) || "/brand-placeholder.png"}
                    alt={brand?.BrandName}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/brand-placeholder.png";
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1 pr-[70px]">
                  <div
                    className="truncate text-[16px] font-semibold leading-[24px] text-black"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {brand?.BrandName}
                  </div>
                  <div
                    className="truncate text-[16px] font-semibold leading-[24px] text-black"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    E-Gift Cards
                  </div>
                  <div
                    className="mt-1 inline-flex h-[20px] min-w-[145px] items-center justify-center rounded-[10px] bg-[linear-gradient(180deg,#78DEFF_50%,#488599_100%)] px-3 text-[10px] font-normal leading-[15px] text-black shadow-[0px_2px_4px_rgba(120,222,255,0.5)]"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {brand?.Category || "E-Commerce & Shopping"}
                  </div>
                </div>
              </div>

              <div className="absolute right-0 top-0 flex h-[30px] items-center rounded-bl-[20px] rounded-tl-[20px] bg-[linear-gradient(129.26deg,#9747FF_20.69%,#5B2B99_72.49%)] px-[10px] text-white">
                <div
                  className="text-center text-[8px] font-normal leading-[12px]"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Cashback
                  <br />
                  <span className="font-semibold">
                    {`${discountPercent}%`}
                  </span>
                </div>
              </div>
            </div>

            <div
              className="amount-box overflow-hidden bg-white shadow-[0px_6px_20px_rgba(0,0,0,0.15)]"
              style={{ borderRadius: 10, padding: "14px 14px" }}
            >
              <div
                className="text-[12px] font-semibold leading-[18px] text-black"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                Select Amount
              </div>

              {min > 0 && min === max ? (
                <div className="mt-[4px]">
                  <div className="flex flex-wrap gap-[6px]">
                    <button className="h-[34px] rounded-[8px] border-2 border-[#9747FF] bg-[#9747FF] px-3 text-[12px] font-semibold leading-[18px] text-white shadow-lg">
                      ₹{min.toLocaleString()}
                    </button>
                  </div>
                  <div className="mt-[2px]">
                    <span className="relative inline-block rounded text-[15px] font-medium leading-[22px] text-[#10B981]">
                      +₹{Math.round(min * discountPercent / 100)} cashback
                    </span>
                  </div>
                </div>
              ) : isFixedType ? (
                <div className="mt-[4px]">
                  <div className="flex flex-wrap gap-[6px]">
                    {(brand?.DenominationList || []).map((denom: number) => {
                      const isActive = amount === denom;
                      const cb = Math.round(denom * discountPercent / 100);
                      return (
                        <button
                          key={denom}
                          onClick={() => setAmount(denom)}
                          className={`h-[34px] rounded-[8px] border-2 px-3 text-[12px] font-semibold leading-[18px] transition-all duration-200 ${
                            isActive
                              ? "border-[#9747FF] bg-[#9747FF] text-white shadow-lg scale-105"
                              : "border-[#DAD5FF] bg-white text-[#3E3E3E] hover:border-[#9747FF]"
                          }`}
                        >
                          ₹{denom.toLocaleString()}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-[2px]">
                    {(brand?.DenominationList || []).map((denom: number) => {
                      if (amount !== denom) return null;
                      const cb = Math.round(denom * discountPercent / 100);
                      return (
                        <motion.span
                          key={`cb-${denom}`}
                          initial={{ opacity: 0, y: -4, scale: 0.9, boxShadow: "0 0 0px rgba(16,185,129,0)" }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: [0.9, 1.12, 1],
                            boxShadow: [
                              "0 0 0px rgba(16,185,129,0)",
                              "0 0 14px rgba(16,185,129,0.4)",
                              "0 0 0px rgba(16,185,129,0)"
                            ]
                          }}
                          transition={{ duration: 0.7, ease: "easeOut" }}
                          style={{ borderRadius: 4, fontFamily: "Poppins, sans-serif" }}
                          className="relative inline-block text-[15px] leading-[22px] text-[#10B981] font-medium"
                        >
                          +₹{cb} cashback
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: 0.3, duration: 0.4, ease: "easeOut" }}
                            style={{ transformOrigin: "center" }}
                            className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[#10B981] rounded-full"
                          />
                        </motion.span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative mt-[4px] px-[4px] pt-[14px]">
                  <div
                    className="amount-bubble pointer-events-none absolute top-[-30px] z-10 rounded-[6px] bg-[#2F80ED] px-2 py-1 text-[12px] font-normal leading-[15px] text-white shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
                    style={{
                      left: `${Math.max(0, Math.min(100, sliderPercent))}%`,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {amount.toLocaleString()}
                  </div>

                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="payment-range"
                    style={{
                      background: `linear-gradient(90deg, #9747FF 0%, #5B2B99 ${sliderPercent}%, #DAD5FF ${sliderPercent}%, #DAD5FF 100%)`,
                    }}
                  />

                  <div
                    className="mt-[4px] flex justify-between text-[8px] leading-[12px] text-black"
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    <span>₹{min.toLocaleString()}</span>
                    <span>₹{max.toLocaleString()}</span>
                  </div>

                  <div className="mt-[4px] text-[9px] leading-[14px] text-[#10B981] font-medium text-right">
                    +₹{Math.round(amount * discountPercent / 100)} cashback
                  </div>
                </div>
              )}

              <div className="quantity-box mt-[6px] border-t border-[#A1A1A1] pt-[4px]">
                <div
                  className="text-[12px] font-semibold leading-[18px] text-black"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Quantity:
                </div>

                <div className="mt-[4px] flex items-center justify-between">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-6 w-6 text-[#4E4E4E]" strokeWidth={2.2} />
                  </button>

                  <input
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, Math.max(1, Number(e.target.value) || 1)))
                    }
                    className="mx-[8px] h-[30px] w-[221px] rounded-[5px] border border-[#9747FF] bg-white text-center text-[12px] font-bold leading-[18px] text-[#4E4E4E] outline-none"
                    inputMode="numeric"
                    aria-label="Quantity"
                  />

                  <button
                    onClick={() => setQuantity(Math.min(MAX_QUANTITY_PER_ITEM, quantity + 1))}
                    disabled={quantity >= MAX_QUANTITY_PER_ITEM}
                    className="grid h-[30px] w-[40px] place-items-center rounded-[5px] border border-[#9747FF] bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-6 w-6 text-[#4E4E4E]" strokeWidth={2.2} />
                  </button>
                </div>
                {quantity >= MAX_QUANTITY_PER_ITEM && (
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Maximum {MAX_QUANTITY_PER_ITEM} of the same gift card per order.
                  </p>
                )}

                <div
                  className="mt-[8px] text-center text-[15px] leading-[22px] text-black"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  Total: ₹{amount.toLocaleString()} x {quantity} ={" "}
                  <span className="font-semibold text-[#9747FF]">
                    ₹{(amount * quantity).toLocaleString()}
                  </span>
                  {discountPercent > 0 && (
                    <span className="ml-1 text-[#10B981]">
                      + ₹{Math.round(amount * quantity * discountPercent / 100).toLocaleString()} cashback
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="info-section mx-auto flex h-[44px] w-[342px] items-center justify-between rounded-[10px] bg-white px-2 shadow-[0px_6px_20px_rgba(0,0,0,0.15)]">
              <button
                type="button"
                onClick={() =>
                  setActiveTab(activeTab === "about" ? null : "about")
                }
                className="inline-flex h-[30px] w-[71px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
              >
                <span className="text-[16px] leading-none">i</span>
                About
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === "how" ? null : "how")}
                className="inline-flex h-[30px] w-[102px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
              >
                <span className="text-[16px] leading-none">*</span>
                How to Use
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveTab(activeTab === "terms" ? null : "terms")
                }
                className="inline-flex h-[30px] w-[73px] items-center justify-center gap-2 rounded-[10px] bg-[#EDEAFF] text-[12px] font-normal leading-[18px] text-[#9747FF]"
              >
                <span className="text-[16px] leading-none">#</span>
                Terms
              </button>
            </div>

            <div className={`expandable ${activeTab ? "open" : ""}`}>
              {activeTab === "about" && (
                <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                  {aboutContent}
                </div>
              )}

              {activeTab === "how" && (
                <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)]">
                  {brand?.RedeemSteps?.length ? (
                    brand.RedeemSteps.map((step: any, index: number) => (
                      <div key={index} className="mb-2 last:mb-0">
                        {step.title || step.name}
                        {step.description ? ` - ${step.description}` : ""}
                      </div>
                    ))
                  ) : (
                    <span>No instructions available.</span>
                  )}
                </div>
              )}

              {activeTab === "terms" && (
                <div className="info-section mx-auto w-[342px] rounded-[10px] bg-white p-4 text-[12px] leading-5 text-[#4B5563] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] whitespace-pre-line">
                  {termsContent}
                </div>
              )}
            </div>
          </div>

          <div className="sheet-footer">
            <div className="bottom-bar">
              <div className="cta-inner">
                {showAddToCart && (
                  <button
                    onClick={handleAddToCart}
                    disabled={isProcessing}
                    className="flex h-[42px] items-center justify-center gap-2 rounded-[10px] cta-gradient disabled:opacity-70"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <span
                      className="text-[14px] font-semibold leading-[20px]"
                    >
                      Add to Cart
                    </span>
                  </button>
                )}

                <button
                  onClick={handlePay}
                  disabled={isProcessing}
                  className="pay-btn flex h-[42px] items-center justify-center shadow-sm transition-colors disabled:opacity-100"
                  aria-label="Pay on Sabbpe"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#9747FF] border-t-transparent" />
                      <span className="pay-text">Processing...</span>
                    </>
                  ) : (
                    <img
                      src={payOnSabbpe}
                      alt="Pay on Sabbpe"
                      className="h-[22px] w-auto object-contain"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AddToCartSuccessModal open={showSuccess} />
    </div>
  );
}
