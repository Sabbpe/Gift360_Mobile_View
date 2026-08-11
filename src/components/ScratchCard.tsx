// components/ScratchCard.tsx
import { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Calendar, CreditCard, Lock, Gift, Send,
  Zap, ShieldCheck, MessageSquare, User, ChevronUp,
} from "lucide-react";
import { ScratchGate } from "@/components/ScratchGate";
import { useGifting } from "@/hooks/useGifting";
import type { VoucherState } from "@/types/order";

interface ScratchCardProps {
  cardNumber: string;
  cardPin: string;
  expiryDate: string;
  amount: string;
  brandName: string;
  index: number;

  orderItemId: string;
  itemId?: string;
  clientId: string;
  orderNumber: string;
  initialState: VoucherState;

  compact?: boolean;

  message?: string;
  logoUrl?: string;
  profileUrl?: string;
}

export function ScratchCard({
  cardNumber,
  cardPin,
  expiryDate,
  amount,
  brandName,
  index,
  orderItemId,
  itemId,
  clientId,
  orderNumber,
  initialState,
  compact = false,
  message,
  logoUrl,
  profileUrl,
}: ScratchCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [voucherState, setVoucherState] = useState<VoucherState>(initialState);

  useEffect(() => {
    setVoucherState(initialState);
  }, [initialState]);

  const { isScratchLoading, isGiftLoading, confirmScratch, confirmGift } = useGifting({
    orderItemId,
    itemId,
    clientId,
    orderNumber,
    brandName,
    voucherAmount: amount,
    onStateChange: (_id, newState) => setVoucherState(newState),
  });

  // ── Canvas setup (PENDING only) ────────────────────────────────────────────
  useEffect(() => {
    if (voucherState !== "PENDING") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#2D1B69");
    gradient.addColorStop(0.5, "#4A1F8E");
    gradient.addColorStop(1, "#6D28D9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const shimmer = ctx.createLinearGradient(0, 0, rect.width, 0);
    shimmer.addColorStop(0, "rgba(255,255,255,0)");
    shimmer.addColorStop(0.5, "rgba(255,215,0,0.15)");
    shimmer.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.font = compact
      ? "bold 11px 'Poppins', system-ui, sans-serif"
      : "bold 17px 'Poppins', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 10;
    ctx.fillText(
      compact ? "✨ Tap to Reveal" : "✨ Scratch to Reveal",
      rect.width / 2,
      rect.height / 2 - (compact ? 6 : 10),
    );
    if (!compact) {
      ctx.font = "13px 'Poppins', system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,215,0,0.8)";
      ctx.shadowBlur = 6;
      ctx.fillText("Tap here to use or gift", rect.width / 2, rect.height / 2 + 14);
    }
  }, [voucherState, compact]);

  const openGate = () => {
    if (voucherState !== "PENDING") return;
    setShowGate(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    openGate();
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    openGate();
  };

  // ── SCRATCHED layout, compact (matches the compact card grid on Orders) ──
  if (voucherState === "SCRATCHED" && compact) {
    return (
      <Card
        className="relative overflow-hidden ring-2 ring-amber-400/60 bg-[#F8F5F4] w-full h-[200px] flex flex-col"
        style={{ boxShadow: "4px 4px 6px 0px rgba(0,0,0,0.15)" }}
      >
        <CardContent className="p-3 flex-1 flex flex-col justify-between min-h-0">
          <div className="flex flex-col items-center text-center gap-1 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-md">
              <Sparkles className="h-4 w-4 text-amber-950" />
            </div>
            <p className="font-bold text-[12px] leading-tight text-[#152039] line-clamp-1 w-full">
              {brandName || `Card #${index + 1}`}
            </p>
            <p className="text-[14px] font-bold text-gold-gradient leading-none">
              ₹{amount}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <div className="flex-1 min-w-0 bg-[#1A3052] rounded-lg px-2 py-1.5">
              <p className="text-[#EBBB64] text-[8px] font-bold leading-tight">Card Number</p>
              <p className="text-white font-bold text-[9px] tracking-tighter leading-tight break-all">{cardNumber}</p>
            </div>
            <div className="flex-1 min-w-0 bg-[#1A3052] rounded-lg px-2 py-1.5">
              <p className="text-[#EBBB64] text-[8px] font-bold leading-tight">PIN</p>
              <p className="text-white font-bold text-[10px] tracking-tight truncate">{cardPin}</p>
            </div>
          </div>

          <div className="flex items-center justify-between shrink-0">
            <p className="text-[10px] font-medium text-[#8A8A8A] truncate">Exp {expiryDate}</p>
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full font-bold shadow-sm flex items-center gap-1 px-2 py-1 text-[9px]">
              <ShieldCheck className="h-2.5 w-2.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── SCRATCHED layout, full (matches Figma design) ─────────────────────────
  if (voucherState === "SCRATCHED") {
    return (
      <>
        <Card
          className="relative overflow-hidden ring-2 ring-amber-400/60 bg-[#F8F5F4]"
          style={{ boxShadow: "4px 4px 6px 0px rgba(0,0,0,0.15)" }}
        >
          <CardContent className="p-0">
            {/* ── Decorative gold diagonal stripe ── */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: "42px",
                height: "163px",
                right: "0",
                top: "225px",
                background: "linear-gradient(337.34deg, #C78D2E 31.98%, #E5B356 49.28%, #C78D2E 72.87%)",
                transform: "rotate(47.6deg)",
                opacity: 0.6,
              }}
            />

            {/* ── Top section: Logo + Profile ── */}
            <div className="relative z-10 flex items-start justify-between p-6 pb-0">
              <div className="w-[159px] h-[59px] rounded-lg bg-white/80 flex items-center justify-center overflow-hidden shadow-sm">
                {logoUrl ? (
                  <img src={logoUrl} alt="Brand Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#C78D2E]" />
                    <span className="text-[10px] font-bold text-[#152039]">gift360</span>
                  </div>
                )}
              </div>
              <div className="w-[70px] h-[70px] rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden border-2 border-[#E4B76C]/30">
                {profileUrl ? (
                  <img src={profileUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-[#C78D2E]/60" />
                )}
              </div>
            </div>

            {/* ── Message section ── */}
            {message && (
              <div className="relative z-10 mx-6 mt-4 p-4 bg-[#1A3052] rounded-[10px]">
                <div className="flex items-center gap-2 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <p className="text-white font-bold text-sm">Message:</p>
                </div>
                <p className="text-white text-[11px] leading-[16px] font-normal">
                  {message}
                </p>
              </div>
            )}

            {/* ── Brand name + Gift Voucher ── */}
            <div className="relative z-10 px-6 mt-5">
              <p className="text-[#152039] font-bold text-[24px] leading-[36px]">
                {brandName}
              </p>
              <p
                className="text-[20px] leading-[30px] font-bold bg-clip-text text-transparent"
                style={{
                  backgroundImage: "linear-gradient(90deg, #C78F3A 0%, #F7C972 50%, #DEAB55 100%)",
                }}
              >
                Gift Voucher
              </p>
              <div
                className="mt-2 h-[3px] rounded-full"
                style={{
                  width: "44px",
                  background: "#E4B76C",
                }}
              />
            </div>

            {/* ── Card details: Number + PIN (left) | Voucher Value (right) ── */}
            <div className="relative z-10 mx-6 mt-5 flex gap-3">
              {/* Left column — Card Number + PIN */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[#EBBB64] font-bold text-xs mb-1">Card Number</p>
                  <div className="bg-[#1A3052] rounded-[20px] px-4 py-2">
                    <p className="text-white font-bold text-xs tracking-wide">
                      {cardNumber}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-[#EBBB64] font-bold text-xs mb-1">Card PIN</p>
                  <div className="bg-[#1A3052] rounded-[20px] px-4 py-2">
                    <p className="text-white font-bold text-xs tracking-widest">
                      {cardPin}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertical divider */}
              <div
                className="w-px self-stretch my-1"
                style={{ background: "#C9C9C9" }}
              />

              {/* Right column — Voucher Value */}
              <div className="flex-1">
                <p className="text-white font-bold text-xs mb-1">Voucher Value</p>
                <div className="bg-[#1A3052] rounded-[10px] p-3 h-[calc(100%-20px)] flex flex-col justify-between">
                  <div>
                    <p className="text-white font-bold text-[28px] leading-[42px]">
                      ₹{amount}
                    </p>
                  </div>
                  <p className="text-white text-[6px] leading-[9px] font-normal">
                    Purchased via gift360
                  </p>
                </div>
              </div>
            </div>

            {/* ── Features row ── */}
            <div className="relative z-10 flex items-center justify-between mx-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[30px] rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Zap className="w-4 h-4 text-[#CEA35C]" />
                </div>
                <p className="text-black text-[7px] leading-[9px] font-medium whitespace-nowrap">
                  Instant Delivery
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[30px] rounded-full bg-white shadow-sm flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-[#CEA35C]" />
                </div>
                <p className="text-black text-[7px] leading-[9px] font-medium whitespace-nowrap">
                  Secure Purchase
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[30px] rounded-full bg-white shadow-sm flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-[#CEA35C]" />
                </div>
                <p className="text-black text-[7px] leading-[9px] font-medium whitespace-nowrap">
                  Valid {expiryDate}
                </p>
              </div>
            </div>

            {/* ── Bottom bar ── */}
            <div
              className="relative z-10 mt-6 px-6 py-4"
              style={{ background: "#0F192A" }}
            >
              {/* Powered By + Terms */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-white text-[8px] leading-[9px] font-medium mb-1">
                    Powered By
                  </p>
                  <div className="h-[29px] w-[70px] bg-white/10 rounded flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#CCA159]" />
                    <span className="text-[8px] font-bold text-[#CCA159] ml-1">gift360</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 cursor-pointer">
                  <p className="text-white text-[10px] leading-[9px] font-semibold underline">
                    Terms and Condition
                  </p>
                  <ChevronUp className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Separator */}
              <div className="h-px w-full bg-[#A1A1A1]/30 mb-3" />

              {/* Trust badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#CCA159]" />
                  <p className="text-white text-[9px] leading-[9px] font-medium">
                    100% Secure
                  </p>
                </div>
                <div className="w-px h-3 bg-[#A1A1A1]" />
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#CCA159" />
                    </svg>
                  </div>
                  <p className="text-white text-[9px] leading-[9px] font-medium">
                    Trusted Platform
                  </p>
                </div>
                <div className="w-px h-3 bg-[#A1A1A1]" />
                <div className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 19.93C7.05 19.43 2.5 14.53 2.5 12C2.5 12 5.5 6 12 6C12.35 6 12.69 6.02 13.03 6.05V19.93ZM19.93 13H13V6.05C18.15 6.5 22 10.25 22 12C22 12.65 21.83 13.28 19.93 13Z" fill="#CCA159" />
                  </svg>
                  <p className="text-white text-[9px] leading-[9px] font-medium">
                    24/7 Support
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  // ── PENDING / GIFTED (original rendering) ─────────────────────────────────
  return (
    <>
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${
          voucherState === "GIFTED"
            ? "ring-2 ring-amber-300/40"
            : ""
        } bg-gradient-to-br from-[#1E1335] to-[#2D1B69] ${
          compact ? "h-[152px] flex flex-col" : ""
        }`}
        style={{ boxShadow: "4px 4px 6px 0px #6E66E74D" }}
      >
        <CardContent className={compact ? "p-2 flex-1 flex flex-col min-h-0" : "p-5"}>
          <div
            className={`relative z-0 ${
              compact ? "flex-1 flex flex-col justify-between min-h-0" : "space-y-4"
            }`}
          >
            {/* Header */}
            {compact ? (
              <div className="flex flex-col items-center text-center gap-0.5 shrink-0">
                <div className="w-6 h-6 rounded-md bg-gold-gradient flex items-center justify-center shadow-md">
                  <Sparkles className="h-3 w-3 text-amber-950" />
                </div>
                <p className="font-bold text-[9px] leading-tight text-white line-clamp-1 w-full">
                  {brandName || `Card #${index + 1}`}
                </p>
                <p className="text-[11px] font-bold text-gold-gradient leading-none">
                  ₹{amount}
                </p>
              </div>
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center shadow-md">
                    <Sparkles className="h-5 w-5 text-amber-950" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-300/70">Gift Voucher</p>
                    <p className="font-bold text-sm text-white">
                      {brandName || `Card #${index + 1}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-amber-300/70 mb-0.5">Value</p>
                  <p className="text-3xl font-bold text-gold-gradient">₹{amount}</p>
                </div>
              </div>
            )}

            {/* Card details */}
            <div className={compact ? "space-y-1 shrink-0" : "space-y-2.5"}>
              <div
                className={`bg-white/5 rounded-lg border border-white/10 shadow-sm backdrop-blur-sm ${
                  compact ? "px-1.5 py-1" : "p-3.5"
                }`}
              >
                <div className={`flex items-center gap-1.5 ${compact ? "mb-0.5" : "gap-2 mb-1.5"}`}>
                  <CreditCard
                    className={
                      compact
                        ? "h-2.5 w-2.5 text-amber-300 shrink-0"
                        : "h-3.5 w-3.5 text-amber-300"
                    }
                  />
                  {!compact && (
                    <p className="text-xs font-semibold text-amber-300/70">Card Number</p>
                  )}
                </div>
                <p
                  className={`font-mono font-bold text-white ${
                    compact ? "text-[8px] tracking-tight truncate" : "text-base tracking-wide"
                  }`}
                >
                  {"•••• ••••"}
                </p>
              </div>

              {!compact && (
                <div className="p-3.5 bg-white/5 rounded-lg border border-white/10 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lock className="h-3.5 w-3.5 text-amber-300" />
                    <p className="text-xs font-semibold text-amber-300/70">Card PIN</p>
                  </div>
                  <p className="font-mono font-bold text-base tracking-widest text-white">
                    {"••••••"}
                  </p>
                </div>
              )}

              <div
                className={`flex items-center justify-between ${
                  compact ? "shrink-0" : "pt-1"
                }`}
              >
                {compact ? (
                  <p className="text-[8px] font-medium text-amber-300/50 truncate">
                    Exp {expiryDate}
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-amber-300/50" />
                    <div>
                      <p className="text-[10px] font-medium text-amber-300/50">Expires</p>
                      <p className="text-xs font-bold text-white">{expiryDate}</p>
                    </div>
                  </div>
                )}

                {voucherState === "GIFTED" && (
                  <div
                    className={`bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full font-bold shadow-sm flex items-center gap-1 ${
                      compact ? "px-1.5 py-0.5 text-[7px]" : "px-3 py-1.5 text-xs"
                    }`}
                  >
                    <Send className={compact ? "h-2 w-2" : "h-3 w-3"} />
                    {!compact && "Gifted"}
                  </div>
                )}
                {voucherState === "PENDING" && (
                  <div
                    className={`bg-white/10 text-amber-300 rounded-full font-bold border border-white/20 ${
                      compact ? "px-1.5 py-0.5 text-[7px]" : "px-3 py-1.5 text-xs"
                    }`}
                  >
                    {compact ? "•" : "Active"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Scratch overlay (PENDING only) ── */}
          {voucherState === "PENDING" && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-10 cursor-pointer w-full h-full touch-none"
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              style={{ touchAction: "none" }}
            />
          )}

          {/* ── Gifted overlay ── */}
          {voucherState === "GIFTED" && (
            <div
              className={`absolute inset-0 z-10 bg-gradient-to-br from-[#1E1335]/95 to-[#2D1B69]/95 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-lg anim-scale-in ${
                compact ? "gap-1" : "gap-3"
              }`}
            >
              <div
                className={`rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30 ${
                  compact ? "w-8 h-8" : "w-14 h-14"
                }`}
              >
                <Gift className={compact ? "h-4 w-4 text-amber-950" : "h-7 w-7 text-amber-950"} />
              </div>
              <div className="text-center">
                <p
                  className={`font-bold text-white ${
                    compact ? "text-[9px]" : "text-sm"
                  }`}
                >
                  {compact ? "Gifted" : "Voucher Gifted"}
                </p>
                {!compact && (
                  <p className="text-xs text-amber-300/60 mt-0.5">Sent to the recipient</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Scratch Gate Modal ── */}
      <ScratchGate
        open={showGate}
        onClose={() => setShowGate(false)}
        onConfirmScratch={confirmScratch}
        onConfirmGift={confirmGift}
        isScratchLoading={isScratchLoading}
        isGiftLoading={isGiftLoading}
        brandName={brandName}
        voucherAmount={amount}
        orderItemId={orderItemId}
      />
    </>
  );
}
