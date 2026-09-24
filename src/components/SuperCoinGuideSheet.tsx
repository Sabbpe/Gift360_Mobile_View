import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ChevronLeft, ChevronRight, Hand, ShoppingCart, User, X } from "lucide-react";
import { useLocation } from "wouter";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

const TOTAL_SCREENS = 4;
const SAMPLE_SC_BALANCE = 250;
const SAMPLE_SC_USABLE = 50;
const SAMPLE_BASE_PRICE = 500;
const SAMPLE_SAVED_PRICE = 450;

type Props = { open: boolean; onClose: () => void };

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

function useCountUp(target: number, active: boolean, reduced: boolean, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, reduced, duration]);
  return value;
}

/* ---------------- Illustrations ---------------- */

function StepCartIllustration({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative mx-auto flex h-[112px] w-full max-w-[250px] items-center justify-center gap-5">
      {/* Voucher card dropping into cart */}
      <motion.div
        initial={reduced ? false : { y: -54, x: 16, opacity: 0, rotate: -14 }}
        animate={{ y: 4, x: 0, opacity: 1, rotate: -6 }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 15, delay: 0.15 }}
        className="w-[104px] rounded-xl border border-dashed border-[#7C3AED]/50 bg-white px-2.5 py-2 shadow-[0_6px_16px_rgba(124,58,237,0.18)]"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]" />
          <span className="text-[8px] font-bold text-gray-800">Gift Voucher</span>
        </div>
        <div className="mt-1.5 h-[1.5px] w-full border-t border-dashed border-gray-200" />
        <span className="mt-1 block text-[11px] font-extrabold text-[#7C3AED]">₹500</span>
      </motion.div>

      {/* Cart */}
      <div className="relative">
        <div className="grid h-[64px] w-[64px] place-items-center rounded-2xl bg-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] border border-purple-100">
          <ShoppingCart className="h-8 w-8 text-[#7C3AED]" strokeWidth={2} />
        </div>
        <motion.span
          initial={reduced ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.25, 1], opacity: 1 }}
          transition={reduced ? { duration: 0 } : { delay: 0.75, duration: 0.45, times: [0, 0.6, 1] }}
          className="absolute -right-2 -top-2 grid h-[22px] min-w-[22px] place-items-center rounded-full bg-[#10B981] px-1 text-[10px] font-extrabold text-white shadow-md"
        >
          +1
        </motion.span>
      </div>
    </div>
  );
}

function StepToggleIllustration({ reduced }: { reduced: boolean }) {
  const [scMode, setScMode] = useState(reduced);
  const [showStats, setShowStats] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setScMode(true);
      setShowStats(true);
      return;
    }
    setScMode(false);
    setShowStats(false);
    const t1 = window.setTimeout(() => setScMode(true), 500);
    const t2 = window.setTimeout(() => setShowStats(true), 1100);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [reduced]);

  const balance = useCountUp(SAMPLE_SC_BALANCE, showStats, reduced);
  const usable = useCountUp(SAMPLE_SC_USABLE, showStats, reduced, 700);

  return (
    <div className="mx-auto w-full max-w-[250px] space-y-3">
      {/* Mock toggle */}
      <div className="flex items-center justify-center gap-2 rounded-2xl bg-white p-3 shadow-[0_6px_16px_rgba(124,58,237,0.12)] border border-purple-100">
        <div className="relative flex w-[196px] items-center rounded-full bg-[#F3F1FE] p-1">
          <span
            className="relative z-10 flex-1 py-1 text-center text-[9px] font-bold transition-colors duration-300"
            style={{ color: scMode ? "#9CA3AF" : "#6D28D9" }}
          >
            Cashback
          </span>
          <span
            className="relative z-10 flex-1 py-1 text-center text-[9px] font-bold transition-colors duration-300"
            style={{ color: scMode ? "#6D28D9" : "#9CA3AF" }}
          >
            SuperCoins
          </span>
          <motion.span
            aria-hidden="true"
            className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
            animate={{ x: scMode ? "100%" : "0%" }}
            transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 30 }}
          />
        </div>
      </div>

      {/* Stat rows */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={showStats ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={reduced ? { duration: 0 } : { duration: 0.3 }}
        className="space-y-2"
      >
        {[
          { label: "Your balance", value: balance, tint: "#6D28D9" },
          { label: "You can use", value: usable, tint: "#10B981" },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-[0_4px_12px_rgba(124,58,237,0.10)] border border-purple-50">
            <div className="flex items-center gap-1.5">
              <img src={superCoinImg} alt="" className="w-[14px] h-[14px] object-contain" />
              <span className="text-[9px] font-semibold text-gray-600">{row.label}</span>
              <span className="rounded-full bg-[#F3F1FE] px-1.5 py-[1px] text-[7px] font-bold text-[#7C3AED]">example</span>
            </div>
            <span className="text-[12px] font-extrabold" style={{ color: row.tint }}>
              {row.value} SC
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function StepApplyIllustration({ reduced }: { reduced: boolean }) {
  const coins = [
    { dx: -26, dy: -30 }, { dx: 22, dy: -34 }, { dx: -34, dy: 8 },
    { dx: 30, dy: 12 }, { dx: 0, dy: -40 },
  ];
  return (
    <div className="relative mx-auto flex h-[112px] w-full max-w-[250px] flex-col items-center justify-center gap-2.5">
      <motion.button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        initial={reduced ? false : { scale: 1 }}
        animate={reduced ? {} : { scale: [1, 0.9, 1.03, 1] }}
        transition={reduced ? { duration: 0 } : { delay: 0.2, duration: 0.55, times: [0, 0.35, 0.7, 1] }}
        className="pointer-events-none inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-[0_6px_16px_rgba(124,58,237,0.35)]"
        style={{ background: "#7C3AED" }}
      >
        <img src={superCoinImg} alt="" className="w-[14px] h-[14px] object-contain" />
        Apply SC
      </motion.button>

      <div className="relative flex items-center gap-2.5 rounded-xl bg-white px-4 py-2 shadow-[0_6px_16px_rgba(124,58,237,0.12)] border border-purple-100">
        <span className="relative text-[15px] font-extrabold text-gray-400">
          ₹{SAMPLE_BASE_PRICE}
          <motion.span
            aria-hidden="true"
            className="absolute top-1/2 left-0 h-[2px] bg-[#E11D48]"
            initial={reduced ? { width: "100%" } : { width: "0%" }}
            animate={{ width: "100%" }}
            transition={reduced ? { duration: 0 } : { delay: 0.85, duration: 0.35, ease: "easeOut" }}
          />
        </span>
        <motion.span
          initial={reduced ? false : { opacity: 0, scale: 0.7, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { delay: 1.15, duration: 0.35, ease: "backOut" }}
          className="text-[18px] font-extrabold text-[#7C3AED]"
        >
          ₹{SAMPLE_SAVED_PRICE}
        </motion.span>

        {/* Coin burst */}
        {!reduced &&
          coins.map((c, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-[7px] w-[7px] rounded-full bg-gradient-to-br from-[#FDE68A] to-[#F59E0B]"
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0], x: c.dx, y: c.dy, scale: 1 }}
              transition={{ delay: 1.45, duration: 0.7, ease: "easeOut" }}
            />
          ))}
      </div>
    </div>
  );
}

function TipIllustration({ reduced }: { reduced: boolean }) {
  return (
    <div
      className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(82,61,169,0.28)]"
      style={{ background: "linear-gradient(135deg,#523da9_0%,#4c42b8_48%,#5365df_100%)" }}
    >
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="space-y-1.5">
          <div className="h-2.5 w-20 rounded-full bg-white/45" />
          <div className="h-1.5 w-28 rounded-full bg-white/25" />
        </div>
        <div className="relative">
          {/* Reused header avatar look (Home header profile button) */}
          <div
            className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#e99da8] text-white"
            style={
              reduced
                ? undefined
                : { animation: "sc-tip-ring 1.8s ease-out infinite" }
            }
          >
            <User className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <motion.div
            className="absolute -bottom-3 -left-4 text-white drop-shadow"
            animate={reduced ? {} : { y: [0, -5, 0], rotate: [0, -8, 0] }}
            transition={reduced ? { duration: 0 } : { duration: 1.4, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" }}
          >
            <Hand className="h-4 w-4" strokeWidth={2.5} />
          </motion.div>
        </div>
      </div>
      <style>{`
        @keyframes sc-tip-ring {
          0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.75); }
          70% { box-shadow: 0 0 0 9px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="sc-tip-ring"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------------- Sheet ---------------- */

export default function SuperCoinGuideSheet({ open, onClose }: Props) {
  const reduced = usePrefersReducedMotion();
  const [, setLocation] = useLocation();
  const sheetRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const dragControls = useDragControls();
  const [screen, setScreen] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (open) {
      setScreen(0);
      setDirection(1);
    }
  }, [open]);

  // Body scroll lock + focus trap + Esc + focus restore
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      sheetRef.current?.focus();
    }, 60);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = sheetRef.current;
      if (!root) return;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!root.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      window.clearTimeout(focusTimer);
      prevFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const goNext = useCallback(() => {
    setDirection(1);
    setScreen((s) => Math.min(TOTAL_SCREENS - 1, s + 1));
  }, []);
  const goPrev = useCallback(() => {
    setDirection(-1);
    setScreen((s) => Math.max(0, s - 1));
  }, []);

  const goToProfile = useCallback(() => {
    onClose();
    setLocation("/profile");
  }, [onClose, setLocation]);

  const isTip = screen === TOTAL_SCREENS - 1;

  const stepMeta = [
    { title: "Add a voucher to your cart", text: "Pick any brand voucher you like and tap 'Add to Cart'.", badge: "" },
    {
      title: "Switch to SuperCoins",
      text: "Toggle from Cashback to SuperCoins in your cart to see your coins and how many you can use.",
      badge: "20% of voucher value",
    },
    { title: 'Tap "Apply SC" and save', text: "Tap 'Apply SC' and the coins are deducted from your total. That's it!", badge: "" },
    { title: "Check your balance anytime", text: "Want to know how many SuperCoins you have? Tap your profile icon at the top right.", badge: "" },
  ];

  const slideVariants = {
    enter: (dir: number) => (reduced ? { opacity: 0 } : { x: dir * 48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => (reduced ? { opacity: 0 } : { x: dir * -48, opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sc-guide-backdrop"
            className="fixed inset-0 z-[110] bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="sc-guide-sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sc-guide-title"
            tabIndex={-1}
            className="fixed bottom-0 left-0 right-0 z-[120] flex max-h-[88vh] flex-col overflow-hidden rounded-t-[28px] bg-[#f4f5fa] shadow-[0_-16px_36px_rgba(22,22,44,0.25)] focus:outline-none"
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={
              reduced
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 320, damping: 26, mass: 0.9 }
            }
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 130 || info.velocity.y > 650) onClose();
            }}
          >
            {/* Drag handle */}
            <div
              className="shrink-0 cursor-grab touch-none active:cursor-grabbing pt-3 pb-1"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="mx-auto h-[5px] w-[48px] rounded-full bg-[#c6cad6]" />
            </div>

            {/* Header */}
            <div className="flex shrink-0 items-start gap-3 px-5 pt-2 pb-3">
              <img src={superCoinImg} alt="" className="mt-0.5 w-8 h-8 object-contain flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 id="sc-guide-title" className="text-[17px] font-bold leading-tight text-[#11131d]">
                  How to use SuperCoins
                </h2>
                <p className="text-[11px] text-gray-500 leading-snug">
                  3 quick steps to save on your next voucher
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-gray-500 shadow-[0_4px_12px_rgba(31,33,59,0.10)] active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Progress: 3 segments + tip dot */}
            <div className="flex shrink-0 items-center gap-1.5 px-5 pb-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${screen >= i ? "bg-[#7C3AED]" : "bg-[#E5E7EB]"}`}
                />
              ))}
              <div
                className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${screen >= 3 ? "bg-[#F59E0B]" : "bg-[#E5E7EB]"}`}
                aria-hidden="true"
              />
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-2">
              <motion.div
                key={screen}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeOut" }}
                drag="x"
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -60 || info.velocity.x < -450) goNext();
                  else if (info.offset.x > 60 || info.velocity.x > 450) goPrev();
                }}
                className="cursor-grab active:cursor-grabbing touch-pan-y"
              >
                <div className="py-1">
                  <div className="mb-4 rounded-2xl bg-white/70 border border-purple-100 py-4 shadow-inner">
                    {screen === 0 && <StepCartIllustration reduced={reduced} />}
                    {screen === 1 && <StepToggleIllustration reduced={reduced} />}
                    {screen === 2 && <StepApplyIllustration reduced={reduced} />}
                    {screen === 3 && <TipIllustration reduced={reduced} />}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15px] font-bold text-[#151722] leading-snug">
                      {stepMeta[screen].title}
                    </h3>
                    {stepMeta[screen].badge && (
                      <span className="inline-flex shrink-0 items-center rounded-full border border-[#7C3AED]/25 bg-[#F3F1FE] px-2 py-[2px] text-[8px] font-bold text-[#7C3AED]">
                        {stepMeta[screen].badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
                    {stepMeta[screen].text}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Footer actions */}
            <div className="shrink-0 border-t border-gray-100 bg-[#f4f5fa]/95 px-5 py-3.5 backdrop-blur-md">
              {isTip ? (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-[13px] font-semibold text-gray-700 active:scale-[0.98] transition-transform"
                  >
                    Got it
                  </button>
                  <button
                    type="button"
                    onClick={goToProfile}
                    className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)] active:scale-[0.98] transition-transform"
                    style={{ background: "#7C3AED" }}
                  >
                    Go to Profile
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={screen === 0}
                    className={`inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 active:scale-[0.98] transition-transform ${screen === 0 ? "opacity-40" : ""}`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Back
                  </button>
                  <span className="text-[11px] font-medium text-gray-400">
                    {screen + 1} of 3
                  </span>
                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex items-center gap-1 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_6px_16px_rgba(124,58,237,0.3)] active:scale-[0.98] transition-transform"
                    style={{ background: "#7C3AED" }}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
