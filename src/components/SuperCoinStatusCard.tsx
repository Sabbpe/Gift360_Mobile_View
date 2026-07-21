import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { Loader2, Info, Check } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { Separator } from "@/components/ui/separator";

type SuperCoinStatusCardProps = {
  mobile?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onStateChange?: (state: { eligible: boolean; balance: number; enabled: boolean }) => void;
  maxRedeemable?: number;
  estimatedEarn?: number;
};

export default function SuperCoinStatusCard({
  mobile,
  enabled = false,
  onEnabledChange,
  onStateChange,
  maxRedeemable,
  estimatedEarn,
}: SuperCoinStatusCardProps) {
  const { identity, searchUserMutation, balanceMutation } = useSuperCoinAccount(mobile);
  const autoSearchKeyRef = useRef<string | null>(null);
  const autoBalanceKeyRef = useRef<string | null>(null);
  const lastStateSignatureRef = useRef<string>("");
  const [localEnabled, setLocalEnabled] = useState(enabled);

  const searchResult = searchUserMutation.data;
  const balanceResult = balanceMutation.data;
  const balance = extractSuperCoinBalance(balanceResult);
  const identityKey = identity?.identifier ?? null;
  const userExists =
    searchResult?.userExists === true ||
    String(searchResult?.state || "").toUpperCase() === "ACTIVATED";

  useEffect(() => {
    if (!identityKey) return;
    if (autoSearchKeyRef.current === identityKey) return;

    autoSearchKeyRef.current = identityKey;
    autoBalanceKeyRef.current = null;
    setLocalEnabled(false);
    onEnabledChange?.(false);
    searchUserMutation.reset();
    balanceMutation.reset();
    searchUserMutation.mutate();
  }, [identityKey, searchUserMutation, balanceMutation, onEnabledChange]);

  useEffect(() => {
    if (!identityKey || !searchResult) return;
    if (!userExists) return;

    if (autoBalanceKeyRef.current === identityKey) return;
    autoBalanceKeyRef.current = identityKey;
    balanceMutation.mutate();
  }, [identityKey, searchResult, userExists, balanceMutation]);

  useEffect(() => {
    setLocalEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    const nextState = {
      eligible: Boolean(identity && userExists),
      balance: balanceResult ? balance : 0,
      enabled: localEnabled,
    };
    const nextSignature = JSON.stringify(nextState);
    if (lastStateSignatureRef.current === nextSignature) return;

    lastStateSignatureRef.current = nextSignature;
    onStateChange?.(nextState);
  }, [balance, balanceResult, identity, localEnabled, onStateChange, userExists]);

  const hasSearchError = searchUserMutation.isError;
  const hasBalanceError = balanceMutation.isError;
  const hasBalanceData = Boolean(userExists && balanceResult);
  const isEligible = hasBalanceData && balance > 0;
  const isEnrolled = Boolean(identity && userExists);
  const isBusy = searchUserMutation.isPending || balanceMutation.isPending;

  const notEnrolledMessage =
    !userExists && searchUserMutation.data && !hasSearchError
      ? "Register on Flipkart SuperCoin to earn & redeem coins on every purchase."
      : "";

  const errorMessage = hasSearchError
      ? "SuperCoin is unavailable at the moment. You can still continue with your purchase."
    : hasBalanceError && (userExists || !searchUserMutation.data)
      ? userExists
        ? "Unable to load your SuperCoin balance. You can still continue with your purchase."
        : "SuperCoin is unavailable at the moment. You can still continue with your purchase."
      : "";
  const activeDeduction = localEnabled && isEligible ? Math.min(balance, maxRedeemable ?? balance) : 0;

  const toggleDisabled = isBusy || (maxRedeemable !== undefined && maxRedeemable <= 0);
  const availableBalance = localEnabled && activeDeduction > 0
    ? Math.max(0, balance - activeDeduction)
    : balance;

  const toggleRef = useRef<HTMLButtonElement>(null);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fireToggleConfetti = useCallback(() => {
    if (prefersReducedMotion) return;
    const el = toggleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    confetti({
      particleCount: 40,
      spread: 70,
      startVelocity: 25,
      scalar: 0.7,
      origin: { x, y },
      colors: ["#7C3AED", "#FBBF24", "#FFFFFF", "#34D399"],
      ticks: 100,
    });
  }, [prefersReducedMotion]);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold cart-text-primary">
          Save more with{" "}
          <span className="text-[#5B3FFF] font-bold">SuperCoin</span>
        </p>
        <Info className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Main card */}
      <div
        className={`
          rounded-xl border p-4 space-y-3 transition-all duration-200 ease-in-out
          ${localEnabled && isEnrolled
            ? "bg-[rgba(151,71,255,0.08)] border-l-[3px] border-l-[var(--cart-primary)] border-t border-r border-b border-t-[rgba(151,71,255,0.3)] border-r-[rgba(151,71,255,0.3)] border-b-[rgba(151,71,255,0.3)]"
            : "border-gray-200 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/40"
          }
        `}
      >
        {/* Loading skeleton */}
        {isBusy && !balanceResult && (
          <div className="flex items-center justify-center py-5">
            <Loader2 className="h-5 w-5 animate-spin text-[#6D5AE6]" />
          </div>
        )}

        {/* No identity */}
        {!identity && !isBusy && (
          <p className="text-xs text-muted-foreground py-1">
            Add a mobile number to use SuperCoin.
          </p>
        )}

        {/* Not enrolled */}
        {notEnrolledMessage && (
          <p className="text-xs text-muted-foreground py-1">
            {notEnrolledMessage}
          </p>
        )}

        {/* Enrolled content */}
        {isEnrolled && (
          <>
            {/* Top row: used info + toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm cart-text-primary">
                  Used{" "}
                  <img
                    src={superCoinIcon}
                    alt=""
                    className="inline h-3.5 w-3.5 align-middle -mt-px"
                  />{" "}
                  <span className="font-bold">{activeDeduction > 0 ? Math.round(activeDeduction) : 0}</span>{" "}
                  to save <span className="font-bold">₹{activeDeduction.toFixed(2)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available balance: {availableBalance.toFixed(2)}
                </p>
              </div>

              {/* Toggle */}
              <button
                ref={toggleRef}
                type="button"
                role="switch"
                aria-checked={localEnabled}
                disabled={toggleDisabled}
                onClick={() => {
                  const nextEnabled = !localEnabled;
                  setLocalEnabled(nextEnabled);
                  onEnabledChange?.(nextEnabled);
                  if (nextEnabled) fireToggleConfetti();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
                  localEnabled
                    ? "bg-gray-900 dark:bg-gray-100"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform flex items-center justify-center ${
                    localEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                >
                  {localEnabled && (
                    <Check className="h-3 w-3 text-gray-900" strokeWidth={3} />
                  )}
                </span>
              </button>
            </div>

            <Separator className="bg-gray-200 dark:bg-gray-700/60" />

            {/* Earn cashback line */}
            {estimatedEarn !== undefined && estimatedEarn > 0 && (
              <p className="text-xs text-muted-foreground">
                Earn up to ₹{estimatedEarn.toFixed(2)} in cashback as SuperCoins on this booking
              </p>
            )}

            {/* Inline error inside card */}
            {errorMessage && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            )}
          </>
        )}

        {/* Error for non-enrolled or general errors when not in enrolled block */}
        {!isEnrolled && errorMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40">
            <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
              {errorMessage}
            </p>
          </div>
        )}
      </div>

      {/* Success banner below card */}
      {localEnabled && isEligible && activeDeduction > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={2.5} />
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            Yay! You saved ₹{activeDeduction.toFixed(2)} on this booking!
          </p>
        </div>
      )}
    </div>
  );
}
