// components/ScratchCard.tsx
import { useRef, useState, useEffect } from "react";
import { Card, CardContent }  from "@/components/ui/card";
import { Sparkles, Calendar, CreditCard, Lock, Gift, Send } from "lucide-react";
import { ScratchGate }        from "@/components/ScratchGate";
import { useGifting }         from "@/hooks/useGifting";
import type { VoucherState }  from "@/types/order";

interface ScratchCardProps {
  cardNumber:   string;
  cardPin:      string;
  expiryDate:   string;
  amount:       string;
  brandName:    string;
  index:        number;

  // Gifting state from server (source of truth)
  orderItemId:  string;
  clientId:     string;
  orderNumber:  string;
  initialState: VoucherState;  // 'PENDING' | 'SCRATCHED' | 'GIFTED'
}

/**
 * Scratch card component with the scratch-gate flow.
 *
 * State machine:
 *   PENDING   → scratch surface shown; gate fires on every click/touch
 *   SCRATCHED → terminal; revealed code shown, no gate
 *   GIFTED    → terminal; locked card shown, no gate
 *
 * The component's local `voucherState` is initialised from `initialState`
 * (server-derived) and updated optimistically after a successful API call.
 * On a 409 CONFLICT the hook re-syncs to the server-reported state.
 *
 * On a successful gift action, useGifting fires a "gift_sent" email to the
 * buyer as a non-blocking side effect.
 */
export function ScratchCard({
  cardNumber,
  cardPin,
  expiryDate,
  amount,
  brandName,
  index,
  orderItemId,
  clientId,
  orderNumber,
  initialState,
}: ScratchCardProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const [isDrawing,     setIsDrawing]     = useState(false);
  const [showGate,      setShowGate]      = useState(false);
  const [voucherState,  setVoucherState]  = useState<VoucherState>(initialState);

  // Keep in sync if the parent re-fetches orders
  useEffect(() => {
    setVoucherState(initialState);
  }, [initialState]);

  const { isScratchLoading, isGiftLoading, confirmScratch, confirmGift } = useGifting({
    orderItemId,
    clientId,
    orderNumber,
    brandName,
    voucherAmount: amount,
    onStateChange: (_id, newState) => setVoucherState(newState),
  });

  // ── Canvas setup (only rendered in PENDING state) ──────────────────────────
  useEffect(() => {
    if (voucherState !== "PENDING") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width  = rect.width  + "px";
    canvas.style.height = rect.height + "px";

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0,   "#2D1B69");
    gradient.addColorStop(0.5, "#4A1F8E");
    gradient.addColorStop(1,   "#6D28D9");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    const shimmer = ctx.createLinearGradient(0, 0, rect.width, 0);
    shimmer.addColorStop(0,   "rgba(255,255,255,0)");
    shimmer.addColorStop(0.5, "rgba(255,215,0,0.15)");
    shimmer.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = shimmer;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.font         = "bold 17px 'Poppins', system-ui, sans-serif";
    ctx.fillStyle    = "rgba(255,255,255,0.95)";
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor  = "rgba(0,0,0,0.3)";
    ctx.shadowBlur   = 10;
    ctx.fillText("✨ Scratch to Reveal", rect.width / 2, rect.height / 2 - 10);
    ctx.font      = "13px 'Poppins', system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,215,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText("Tap here to use or gift", rect.width / 2, rect.height / 2 + 14);
  }, [voucherState]);

  // ── Scratch interaction — opens gate instead of revealing directly ─────────
  const openGate = () => {
    if (voucherState !== "PENDING") return;
    setShowGate(true);
  };

  const handleMouseDown  = (e: React.MouseEvent) => { e.preventDefault(); openGate(); };
  const handleTouchStart = () => { openGate(); };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${
          voucherState === "SCRATCHED"
            ? "ring-2 ring-amber-400/60"
            : voucherState === "GIFTED"
            ? "ring-2 ring-amber-300/40"
            : ""
        } bg-gradient-to-br from-[#1E1335] to-[#2D1B69]`}
        style={{ boxShadow: '4px 4px 6px 0px #6E66E74D' }}
      >
        <CardContent className="p-5">
          {/* ── Voucher body (always rendered underneath) ── */}
          <div className="relative z-0 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center shadow-md">
                  <Sparkles className="h-5 w-5 text-amber-950" />
                </div>
                <div>
                  <p className="text-xs font-medium text-amber-300/70">Gift Voucher</p>
                  <p className="font-bold text-sm text-white">{brandName || `Card #${index + 1}`}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-amber-300/70 mb-0.5">Value</p>
                <p className="text-3xl font-bold text-gold-gradient">
                  ₹{amount}
                </p>
              </div>
            </div>

            {/* Card details */}
            <div className="space-y-2.5">
              <div className="p-3.5 bg-white/5 rounded-lg border border-white/10 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-amber-300" />
                  <p className="text-xs font-semibold text-amber-300/70">Card Number</p>
                </div>
                <p className="font-mono font-bold text-base tracking-wide text-white">
                  {voucherState === "SCRATCHED" ? cardNumber : "••••  ••••  ••••"}
                </p>
              </div>

              <div className="p-3.5 bg-white/5 rounded-lg border border-white/10 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-300" />
                  <p className="text-xs font-semibold text-amber-300/70">Card PIN</p>
                </div>
                <p className="font-mono font-bold text-base tracking-widest text-white">
                  {voucherState === "SCRATCHED" ? cardPin : "••••••"}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-amber-300/50" />
                  <div>
                    <p className="text-[10px] font-medium text-amber-300/50">Expires</p>
                    <p className="text-xs font-bold text-white">{expiryDate}</p>
                  </div>
                </div>

                {/* Status badge */}
                {voucherState === "SCRATCHED" && (
                  <div className="px-3 py-1.5 bg-gold-gradient text-amber-950 rounded-full text-xs font-bold shadow-sm">
                    ✓ Revealed
                  </div>
                )}
                {voucherState === "GIFTED" && (
                  <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Gifted
                  </div>
                )}
                {voucherState === "PENDING" && (
                  <div className="px-3 py-1.5 bg-white/10 text-amber-300 rounded-full text-xs font-bold border border-white/20">
                    Active
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
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#1E1335]/95 to-[#2D1B69]/95 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-lg anim-scale-in">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Gift className="h-7 w-7 text-amber-950" />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-sm">Voucher Gifted</p>
                <p className="text-xs text-amber-300/60 mt-0.5">Sent to the recipient</p>
              </div>
            </div>
          )}

          {/* ── Revealed celebration overlay ── */}
          {voucherState === "SCRATCHED" && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/10 via-transparent to-amber-400/10 animate-pulse" />
              <div className="absolute top-3 right-3 bg-gold-gradient text-amber-950 px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-amber-500/30 animate-bounce">
                🎉 Revealed!
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
