import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { Loader2, Check } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import flipkartSuperCoinIcon from "@/assets/FlipKartSuperCoin-removebg-preview.png";
import { Separator } from "@/components/ui/separator";

type SuperCoinStatusCardProps = {
  mobile?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onStateChange?: (state: { eligible: boolean; balance: number; enabled: boolean }) => void;
  maxRedeemable?: number;
  estimatedEarn?: number;
  hideToggle?: boolean;
  coinsOnHold?: number;
  supercoinMultiplier?: number;
};

export default function SuperCoinStatusCard({
  mobile,
  enabled = false,
  onEnabledChange,
  onStateChange,
  maxRedeemable,
  estimatedEarn,
  hideToggle = false,
  coinsOnHold = 0,
  supercoinMultiplier = 1.25,
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
  const shouldDeduct = localEnabled && isEligible;
  const activeDeduction = shouldDeduct ? Math.min(balance, maxRedeemable ?? balance) : 0;
  const previewDeduction = !shouldDeduct && hideToggle && isEligible
    ? Math.min(balance, maxRedeemable ?? balance)
    : 0;

  const toggleDisabled = isBusy || (maxRedeemable !== undefined && maxRedeemable <= 0);
  const availableBalance = shouldDeduct && activeDeduction > 0
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
      <div className="flex items-center gap-3">
        <img src={flipkartSuperCoinIcon} alt="" className="h-14 w-auto max-w-[180px] shrink-0 object-contain" />
        <div className="flex-1">
          <p className="text-sm font-semibold cart-text-primary leading-tight">
            Save more with{" "}
            <span className="text-[#5B3FFF] font-bold">SuperCoins</span>
          </p>
          <p className="text-[10px] cart-text-primary opacity-70 mt-0.5">Powered by Flipkart</p>
        </div>
      </div>

      {/* Main card */}
      <div
        className={`
          rounded-xl border p-4 space-y-3 transition-all duration-200 ease-in-out
          ${localEnabled && isEnrolled
            ? "bg-[rgba(151,71,255,0.08)] border-l-[3px] border-l-[var(--cart-primary)] border-t border-r border-b border-t-[rgba(151,71,255,0.3)] border-r-[rgba(151,71,255,0.3)] border-b-[rgba(151,71,255,0.3)]"
            : "border-[rgba(151,71,255,0.2)] bg-[rgba(151,71,255,0.04)]"
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
            {/* Top row: usage info */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm cart-text-primary flex items-center gap-1">
                  Use{" "}
                  <span className="font-bold">
                    {activeDeduction > 0
                      ? activeDeduction.toFixed(2)
                      : previewDeduction > 0
                        ? previewDeduction.toFixed(2)
                        : "0.00"}
                  </span>
                  {" "}
                  <img
                    src={superCoinIcon}
                    alt=""
                    className="inline h-4 w-4 align-middle -mt-px"
                  />
                </p>
                {(activeDeduction > 0 || previewDeduction > 0) && (
                  <p className="text-sm font-semibold cart-text-primary">
                    Save ₹{((activeDeduction > 0 ? activeDeduction : previewDeduction) / supercoinMultiplier).toFixed(2)} on this order
                  </p>
                )}
                <p className="text-sm font-semibold cart-text-primary">
                  Your SuperCoin balance: {availableBalance.toFixed(2)} coins
                </p>
              </div>

              {/* Toggle */}
              {!hideToggle && (
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
              )}
            </div>

            <Separator className="bg-[rgba(151,71,255,0.2)]" />

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

      {/* Reserved hold banner */}
      {coinsOnHold > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-[rgba(151,71,255,0.08)] to-[rgba(151,71,255,0.04)] border border-[rgba(151,71,255,0.2)] shadow-[0_2px_8px_rgba(151,71,255,0.1)]">
          <span className="text-sm">🔒</span>
          <p className="text-xs font-semibold text-[#7C3AED]">
            {Math.round(coinsOnHold)} coin(s) reserved — saving ₹{(coinsOnHold / supercoinMultiplier).toFixed(2)} on this order
          </p>
        </div>
      )}
      {/* Success banner below card */}
      {localEnabled && isEligible && activeDeduction > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[rgba(151,71,255,0.08)] border border-[rgba(151,71,255,0.25)]">
          <Check className="h-4 w-4 text-[#7C3AED] shrink-0" strokeWidth={2.5} />
          <p className="text-xs font-medium text-[#7C3AED]">
            Yay! You saved ₹{activeDeduction.toFixed(2)} on this booking!
          </p>
        </div>
      )}
    </div>
  );
}
