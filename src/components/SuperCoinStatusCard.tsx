import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type SuperCoinStatusCardProps = {
  mobile?: string;
  enabled?: boolean;
  onEnabledChange?: (enabled: boolean) => void;
  onStateChange?: (state: { eligible: boolean; balance: number; enabled: boolean }) => void;
};

export default function SuperCoinStatusCard({
  mobile,
  enabled = false,
  onEnabledChange,
  onStateChange,
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
  const activeDeduction = localEnabled && isEligible ? balance : 0;
  const balanceLabel = isBusy
    ? "Checking..."
    : hasError
      ? "Unavailable"
      : balanceResult
        ? `\u20b9${balance.toFixed(2)}`
        : "-";

  return (
    <Card className="rounded-3xl border-0 bg-gradient-to-br from-[#1b1533] via-[#251e47] to-[#12101f] text-white shadow-[0_20px_45px_rgba(32,18,68,0.18)]">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/55">SuperCoin</p>
            <h3 className="text-lg font-bold text-white">Flipkart Wallet Check</h3>
          </div>
          <Badge className={statusTone}>{statusLabel}</Badge>
        </div>
        <p className="text-sm text-white/65">
          Eligibility and balance are fetched automatically on this checkout screen.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-white/60">Identity</span>
            <span className="font-medium text-white">
              {mobile || "No mobile number found"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span className="text-white/60">Balance</span>
            <span className="flex items-center gap-2 font-semibold text-white">
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin text-white/70" />
              ) : (
                <Sparkles className="h-4 w-4 text-amber-300" />
              )}
              {balanceLabel}
            </span>
          </div>
          {searchResult?.state && (
            <p className="mt-3 text-xs text-white/55">
              Flipkart state: {String(searchResult.state)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Use SuperCoin</p>
            <p className="text-xs text-white/55">
              Turn on to reduce the payable amount using your full eligible balance.
            </p>
          </div>
          <Switch
            checked={localEnabled}
            onCheckedChange={(checked) => {
              const nextEnabled = Boolean(checked);
              setLocalEnabled(nextEnabled);
              onEnabledChange?.(nextEnabled);
            }}
            disabled={!identity || isBusy}
          />
        </div>

        {activeDeduction > 0 && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <div className="flex items-center justify-between gap-3">
              <span className="text-emerald-50/80">SuperCoin deduction</span>
              <span className="font-semibold">{`\u20b9${activeDeduction.toFixed(2)}`}</span>
            </div>
          </div>
        )}

        {!identity ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Login with a user that has a mobile number to check SuperCoin.</p>
          </div>
        ) : null}

        {hasError && (
          <>
            <Separator className="bg-white/10" />
            <p className="text-sm text-red-300">{errorMessage}</p>
          </>
        )}

        <p className="text-xs leading-5 text-white/50">
          Manual check, enrol, and balance controls are hidden here so checkout stays clean. If the user is eligible, the balance appears automatically.
        </p>
      </CardContent>
    </Card>
  );
}
