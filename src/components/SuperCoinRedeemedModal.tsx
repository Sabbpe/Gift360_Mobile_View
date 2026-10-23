import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";

type SuperCoinRedeemedModalProps = {
  open: boolean;
  /** Fired exactly once when the 3-2-1 countdown reaches zero. */
  onContinue: () => void;
};

/**
 * Purely cosmetic bridge shown right after the Flipkart OTP confirms the
 * SuperCoin hold: "Your SuperCoins are redeemed — continue payment in
 * 3…2…1". It has no interactive elements; when the timer hits zero it
 * hands off to the payment flow via `onContinue`, every time.
 */
export default function SuperCoinRedeemedModal({
  open,
  onContinue,
}: SuperCoinRedeemedModalProps) {
  const [count, setCount] = useState(3);
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  // One self-contained timer per open: local counter, no shared refs that
  // can go stale between attempts — the handoff always fires while open.
  useEffect(() => {
    if (!open) return;
    let n = 3;
    setCount(3);
    const id = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(id);
        onContinueRef.current();
      } else {
        setCount(n);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!open) return null;

  const shown = Math.max(count, 1);

  return (
    <div className="fixed inset-0 z-[12000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        role="dialog"
        aria-modal="true"
        aria-live="polite"
        className="relative w-full max-w-[340px] rounded-[28px] bg-white px-6 pb-6 pt-7 text-center shadow-[0_24px_64px_rgba(33,24,74,0.28)]"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        {/* Redeemed badge: coin + success tick */}
        <div className="relative mx-auto h-16 w-16">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[rgba(151,71,255,0.08)] ring-[6px] ring-[rgba(151,71,255,0.12)]">
            <img
              loading="lazy"
              decoding="async"
              src={superCoinIcon}
              alt=""
              className="h-10 w-10 object-contain"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-[#34D399] text-white ring-4 ring-white">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </div>

        <p className="mt-4 text-[15px] font-bold leading-snug text-[#111827]">
          Your{" "}
          <img
            loading="lazy"
            decoding="async"
            src={superCoinIcon}
            alt="SuperCoins"
            className="inline-block h-5 w-5 align-[-3px]"
          />{" "}
          SuperCoins are redeemed
        </p>
        <p className="mt-1 text-xs font-medium text-[#6B7280]">
          Continue payment in
        </p>

        {/* Big 3 · 2 · 1 countdown */}
        <div className="mt-2 flex h-[72px] items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={shown}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="bg-gradient-to-r from-[#9747FF] to-[#5B2B99] bg-clip-text text-[64px] font-extrabold leading-none text-transparent"
            >
              {shown}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* 3-second drain */}
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEAFF]">
          <motion.div
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 3, ease: "linear" }}
            className="h-full w-full origin-left rounded-full bg-gradient-to-r from-[#9747FF] to-[#34D399]"
          />
        </div>

        <p className="mt-3 text-[11px] font-medium text-[#6B7280]">
          Opening secure payment…
        </p>
      </motion.div>
    </div>
  );
}
