import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuthContext } from "@/contexts/AuthContext";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";
import blinkitBg from "@/assets/blinkit.png";

const BLINKIT_BRAND_ID = "a5fea1a3-3e17-414f-a953-407125080d77";
const BASE_PRICE = 500;
const DISCOUNTED_PRICE = 400;
const DISCOUNT_PERCENT = 20;
const STATIC_SC_BALANCE = 250;
const MAX_DEMO_PLAYS = 3;
const DEMO_STORAGE_KEY = "sc_nudge_seen_blinkit";

function hasSeenDemo(clientId?: string | null): boolean {
  const key = clientId ? `${DEMO_STORAGE_KEY}_${clientId}` : null;
  if (!key) return true;
  try { return localStorage.getItem(key) === "1"; } catch { return true; }
}

function markDemoSeen(clientId?: string | null) {
  const key = clientId ? `${DEMO_STORAGE_KEY}_${clientId}` : null;
  if (!key) return;
  try { localStorage.setItem(key, "1"); } catch {}
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

type Props = { onExplore?: () => void };

export default function BlinkitSuperCoinNudge({ onExplore }: Props) {
  const [, setLocation] = useLocation();
  const reduced = usePrefersReducedMotion();
  const { user } = useAuthContext();

  const alreadySeen = useMemo(() => hasSeenDemo(user?.clientId), [user?.clientId]);

  const [demoPhase, setDemoPhase] = useState<"idle" | "waiting" | "ghost_tap" | "toggling" | "on" | "pause" | "off">("idle");
  const [demoPlayCount, setDemoPlayCount] = useState(0);
  const [userInteracted, setUserInteracted] = useState(false);
  const [toggleOn, setToggleOn] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const clearTimer = useCallback(() => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } }, []);

  const schedule = useCallback((phase: typeof demoPhase, delay: number) => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current || userInteracted) return;
      setDemoPhase(phase);
    }, delay);
  }, [clearTimer, userInteracted]);

  useEffect(() => {
    if (reduced || alreadySeen || userInteracted || demoPlayCount >= MAX_DEMO_PLAYS) {
      setDemoPhase("idle");
      return;
    }

    setDemoPhase("waiting");
    schedule("ghost_tap", 3500);

    return clearTimer;
  }, [demoPlayCount, reduced, alreadySeen, userInteracted, schedule, clearTimer]);

  useEffect(() => {
    if (demoPhase === "ghost_tap") {
      schedule("toggling", 500);
    } else if (demoPhase === "toggling") {
      setToggleOn(true);
      schedule("on", 1800);
    } else if (demoPhase === "on") {
      setToggleOn(false);
      schedule("off", 400);
    } else if (demoPhase === "off") {
      schedule("idle", 300);
      setTimeout(() => {
        if (!mountedRef.current || userInteracted) return;
        setDemoPlayCount((c) => c + 1);
      }, 100);
    }
  }, [demoPhase, userInteracted, schedule]);

  const handleUserToggle = useCallback(() => {
    if (demoPhase !== "idle") {
      clearTimer();
      setDemoPhase("idle");
      setUserInteracted(true);
      markDemoSeen(user?.clientId);
    }
    setToggleOn((p) => !p);
  }, [demoPhase, clearTimer, user?.clientId]);

  const handleCardTap = useCallback(() => {
    if (demoPhase !== "idle") {
      clearTimer();
      setUserInteracted(true);
      markDemoSeen(user?.clientId);
    }
    setLocation(`/brand/${BLINKIT_BRAND_ID}`);
  }, [demoPhase, clearTimer, user?.clientId, setLocation]);

  const ghostVisible = demoPhase === "ghost_tap" || demoPhase === "toggling";

  return (
    <div className="relative w-full h-[185px] overflow-hidden rounded-xl" onClick={handleCardTap}>
      <style>{`
        @keyframes ghost-down { 0% { transform: translateY(-16px) scale(0.85); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes ghost-tap { 0%,100% { transform: scale(1); } 50% { transform: scale(0.85); } }
        @keyframes ripple { 0% { transform: scale(0); opacity: 0.5; } 100% { transform: scale(3); opacity: 0; } }
        @keyframes price-in { 0% { transform: translateY(-4px) scale(0.85); opacity: 0; } 60% { transform: translateY(1px) scale(1.04); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes badge-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes nudge-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* Blinkit backdrop */}
      <img src={blinkitBg} alt="" className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none" />

      {/* Soft overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.05) 100%)" }} />

      {/* SC guide text — beside "Blinkit delivery" on backdrop */}
      <div className="absolute top-[34px] left-[165px] z-10 flex items-center gap-1 pointer-events-none">
        {["Apply SC", "SuperCoins Applied", "₹100 saved"].map((label, i) => (
          <span key={label} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-[9px] text-[#F8CB46]/60 font-extrabold">→</span>}
            <span className="inline-flex items-center gap-[3px] rounded-full bg-white/80 backdrop-blur-sm px-2 py-[3px] shadow-[0_1px_4px_rgba(248,203,70,0.12)]">
              <img src={superCoinImg} alt="" className="w-2 h-2 object-contain" />
              <span className="text-[8px] font-extrabold text-[#F59E0B] leading-none whitespace-nowrap">{label}</span>
            </span>
          </span>
        ))}
      </div>

      {/* SC demo card — hero element */}
      <div className="absolute left-4 bottom-3 z-10">
        <div className="relative w-[140px] rounded-xl bg-white/95 backdrop-blur-sm border border-amber-100 shadow-[0_6px_20px_rgba(245,158,11,0.18)] overflow-visible flex flex-col px-2 pt-2 pb-1.5 cursor-pointer active:scale-[0.98] transition-transform">
          {/* Top left: 30% OFF pill */}
          <div className="absolute top-1.5 left-1.5 z-20" style={{ opacity: toggleOn ? 1 : 0, transform: toggleOn ? "scale(1)" : "scale(0)", transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <span className="inline-block rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] px-1.5 py-0.5 text-[7px] font-extrabold text-white shadow-sm">{DISCOUNT_PERCENT}% OFF</span>
          </div>

          {/* Top right: SC balance */}
          <div className="flex items-center justify-end gap-1 mb-0.5">
            <img src={superCoinImg} alt="" className="w-3 h-3 object-contain" />
            <span className="text-[7px] font-bold text-gray-500">{toggleOn ? STATIC_SC_BALANCE - 100 : STATIC_SC_BALANCE} SC available</span>
          </div>

          {/* Brand name */}
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-5 h-5 rounded-full bg-[#F8CB46] flex items-center justify-center"><span className="text-[7px] font-extrabold text-[#1A1A1A] leading-none">blinkit</span></div>
            <span className="text-[9px] font-bold text-gray-900">Blinkit</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="relative">
              <span className="text-[14px] font-bold" style={{ color: toggleOn ? "#9CA3AF" : "#111827", transition: "color 0.3s" }}>₹{BASE_PRICE}</span>
              <div className="absolute top-1/2 left-0 h-[1.5px] bg-red-400" style={{ width: toggleOn ? "100%" : "0%", transition: "width 0.4s ease" }} />
            </div>
            <div className="h-[22px] flex items-center justify-center">
              <span key={toggleOn ? "on" : "off"} className="text-[17px] font-extrabold text-[#F59E0B]" style={{ animation: toggleOn ? "price-in 0.35s cubic-bezier(0.34,1.56,0.64,1)" : undefined }}>
                ₹{toggleOn ? DISCOUNTED_PRICE : BASE_PRICE}
              </span>
            </div>
            {toggleOn && (
              <span key="redeemed" className="absolute -top-0.5 -right-1 text-[6px] font-bold text-[#10B981] leading-tight whitespace-nowrap" style={{ animation: "badge-in 0.3s cubic-bezier(0.34,1.56,0.64,1)" }}>max 20% redeemable</span>
            )}
          </div>

          <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
            <span className="text-[7px] font-semibold text-[#F59E0B] leading-tight">Toggle ON for demo</span>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={handleUserToggle} className="relative w-[32px] h-[18px] rounded-full transition-colors duration-300 focus:outline-none" style={{ background: toggleOn ? "linear-gradient(135deg,#F59E0B,#EAB308)" : "#D1D5DB" }} aria-label="Toggle SuperCoins">
                <span className="absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm" style={{ transform: toggleOn ? "translateX(14px)" : "translateX(0)", transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)" }} />
                {ghostVisible && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none" style={{ animation: "ghost-down 0.4s ease-out forwards" }}>
                    <div className="w-4 h-4 rounded-full bg-gray-300/70 border-2 border-gray-400/50" style={{ animation: demoPhase === "toggling" ? "ghost-tap 0.2s ease-in-out" : "none" }} />
                    {demoPhase === "toggling" && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-amber-400/40" style={{ animation: "ripple 0.4s ease-out forwards" }} />}
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SC nudge label */}
      <div className="absolute right-4 bottom-3 z-10 flex items-center gap-1" style={{ animation: "nudge-pulse 2s ease-in-out infinite" }}>
        <img src={superCoinImg} alt="" className="w-2.5 h-2.5 object-contain flex-shrink-0" />
        <span className="text-[7px] font-semibold text-[#F59E0B] leading-tight drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">Try the toggle — see {DISCOUNT_PERCENT}% off</span>
      </div>
    </div>
  );
}
