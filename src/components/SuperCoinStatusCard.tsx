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
};

export default function SuperCoinStatusCard({
  mobile,
  enabled = false,
  onEnabledChange,
  onStateChange,
  maxRedeemable,
  walletActive = false,
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

  const isEligible = Boolean(identity && userExists && balanceResult && balance > 0);
  const isBusy = searchUserMutation.isPending || balanceMutation.isPending;
  const statusLabel = !identity
    ? "Login required"
    : searchUserMutation.isPending
      ? "Checking..."
      : balanceMutation.isPending
        ? "Fetching balance..."
        : userExists
          ? "Eligible"
          : searchUserMutation.data
            ? "Not enrolled"
            : "Check required";

  const statusTone = !identity
    ? "bg-muted text-muted-foreground"
    : isBusy
      ? "bg-sky-500/10 text-sky-300 border-sky-500/20"
      : userExists
        ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";

  const hasError = searchUserMutation.isError || balanceMutation.isError;
  const errorMessage =
    searchUserMutation.error?.message ||
    balanceMutation.error?.message ||
    "SuperCoin request failed.";
  const activeDeduction = localEnabled && isEligible ? Math.min(balance, maxRedeemable ?? balance) : 0;
  const balanceLabel = isBusy
    ? "Checking..."
    : hasError
      ? "Unavailable"
      : balanceResult
        ? `\u20b9${balance.toFixed(2)}`
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
            <Sparkles className="h-4 w-4 text-[var(--cart-primary)]" />
            SuperCoin
            {isEligible && (
              <span className="text-xs text-muted-foreground ml-1">
                · Balance: ₹{balance.toFixed(2)}
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
                      ? `Up to ₹${maxRedeemable.toFixed(2)} can be redeemed`
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

        {!identity && (
          <p className="text-xs text-muted-foreground italic">Add a mobile number to use SuperCoin.</p>
        )}

        {hasError && (
          <p className="text-xs text-red-500">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
