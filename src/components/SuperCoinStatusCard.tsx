import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SuperCoinStatusCardProps = {
  mobile?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onStateChange?: (state: { eligible: boolean; balance: number; enabled: boolean }) => void;
  maxRedeemable?: number;
  walletActive?: boolean;
  estimatedEarn?: number;
};

export default function SuperCoinStatusCard({
  mobile,
  enabled = false,
  onEnabledChange,
  onStateChange,
  maxRedeemable,
  walletActive = false,
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
    balanceMutation.mutate();
  }, [identityKey, searchUserMutation, balanceMutation, onEnabledChange]);

  useEffect(() => {
    if (!identityKey || !searchResult) return;
    if (autoBalanceKeyRef.current === identityKey) return;
    if (!userExists) return;

    autoBalanceKeyRef.current = identityKey;
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
  const isEligible = Boolean(identity && userExists && balanceResult && balance > 0);
  const isBusy = searchUserMutation.isPending || balanceMutation.isPending;
  const statusLabel = !identity
    ? "Login required"
    : hasSearchError
      ? "Unable to verify"
      : searchUserMutation.isPending
        ? "Checking..."
        : !userExists && searchUserMutation.data
          ? "Not enrolled"
          : balanceMutation.isPending
            ? "Fetching balance..."
            : userExists
              ? "Eligible"
              : "Check required";

  const statusTone = !identity
    ? "bg-muted text-muted-foreground"
    : hasSearchError
      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      : isBusy
        ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
        : !userExists && searchUserMutation.data
          ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
          : userExists
            ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";

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
  const balanceLabel = isBusy
    ? "Checking..."
    : (hasSearchError || hasBalanceError)
      ? "Unavailable"
      : balanceResult
        ? `${balance.toFixed(2)} SC`
        : "-";

  return (
    <div
      className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${
        isEligible
          ? "bg-[rgba(151,71,255,0.08)] border-[rgba(151,71,255,0.3)]"
          : isBusy
            ? "bg-[rgba(151,71,255,0.04)] border-[rgba(151,71,255,0.15)]"
            : "bg-muted/50 border-muted-foreground/20 opacity-60"
      }`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm sm:text-base font-medium flex items-center gap-2">
            <img
              src="/supercoin-logo.png"
              alt="SuperCoin"
              className="h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {isEligible && (
              <span className="text-xs text-muted-foreground ml-1">
                · Balance: {balance.toFixed(2)} SC
              </span>
            )}
          </label>
          <Badge className={statusTone}>{statusLabel}</Badge>
        </div>

        {isEligible && (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium cart-text-primary">Use SuperCoin</p>
                <p className="text-xs text-muted-foreground">
                  {walletActive
                    ? ""
                    : maxRedeemable !== undefined && maxRedeemable > 0 && maxRedeemable < balance
                      ? `Up to ${maxRedeemable.toFixed(2)} SC can be redeemed`
                      : "Reduce your payable amount"}
                </p>
              </div>
              <Switch
                checked={localEnabled}
                onCheckedChange={(checked) => {
                  const nextEnabled = Boolean(checked);
                  setLocalEnabled(nextEnabled);
                  onEnabledChange?.(nextEnabled);
                }}
                disabled={isBusy || (maxRedeemable !== undefined && maxRedeemable <= 0) || walletActive}
              />
            </div>

            {activeDeduction > 0 && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                You save ₹{activeDeduction.toFixed(2)}
              </p>
            )}
          </>
        )}

        {isEligible && estimatedEarn !== undefined && estimatedEarn > 0 && (
          <>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              <Sparkles className="h-3 w-3 inline mr-1 text-amber-400" />
              You'll earn <span className="font-semibold text-emerald-600 dark:text-emerald-400">{estimatedEarn.toFixed(2)} SC</span> back on this purchase
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              Fractional earnings carry over to your next purchase.
            </p>
          </>
        )}

        {!identity && (
          <p className="text-xs text-muted-foreground italic">Add a mobile number to use SuperCoin.</p>
        )}

        {notEnrolledMessage && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{notEnrolledMessage}</p>
        )}

        {(hasSearchError || hasBalanceError) && (
          <p className="text-xs text-red-500">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
