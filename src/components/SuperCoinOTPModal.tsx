import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Check, Clock } from "lucide-react";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import flipkartSuperCoinIcon from "@/assets/FlipKartSuperCoin-removebg-preview.png";
import {
  fetchSuperCoinBalance,
  initSuperCoinHold,
  authorizeSuperCoinHold,
  extractSuperCoinBalance,
  type SuperCoinIdentity,
} from "@/api/supercoinApi";

export type SuperCoinHoldContext = {
  merchantTransactionId: string;
  merchantWalletId: string;
  amount: number;
  stampExpiry?: number;
  transactionTime?: string;
};

type Step = "loading_balance" | "ready" | "otp_sent" | "authorized";

type SuperCoinOTPModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthorized: (context: SuperCoinHoldContext) => void;
  onSwitchToCashback: () => void;
  identity: SuperCoinIdentity;
  merchantWalletId: string;
  orderNumber: string;
  displayName: string;
  preloadedBalance: number;
  maxRedeemable: number;
};

export default function SuperCoinOTPModal({
  open,
  onClose,
  onAuthorized,
  onSwitchToCashback,
  identity,
  merchantWalletId,
  orderNumber,
  displayName,
  preloadedBalance,
  maxRedeemable,
}: SuperCoinOTPModalProps) {
  const [step, setStep] = useState<Step>("loading_balance");
  const [balance, setBalance] = useState(preloadedBalance);
  const [coinAmount, setCoinAmount] = useState(0);
  const [otp, setOtp] = useState("");
  const [prefilledOtp, setPrefilledOtp] = useState("");
  const [merchantTransactionId, setMerchantTransactionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionTime, setTransactionTime] = useState<string | null>(null);
  const [countdown, setCountdown] = useState({ display: "15:00", minutes: "15", seconds: "00", expired: false });
  const timerRef = useRef<number>(0);
  const [holdExpiryMs, setHoldExpiryMs] = useState<number | null>(null);

  const calcCountdown = useCallback((txTime: string) => {
    const startMs = new Date(txTime).getTime();
    const endMs = startMs + 15 * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, endMs - now);
    const mins = String(Math.floor(remaining / 60000)).padStart(2, "0");
    const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");
    return { display: `${mins}:${secs}`, minutes: mins, seconds: secs, expired: remaining <= 0 };
  }, []);

  const resetState = useCallback(() => {
    setStep("loading_balance");
    setBalance(preloadedBalance);
    setCoinAmount(Math.min(preloadedBalance, maxRedeemable));
    setOtp("");
    setPrefilledOtp("");
    setMerchantTransactionId("");
    setError(null);
    setIsLoading(false);
    setTransactionTime(null);
    setCountdown({ display: "15:00", minutes: "15", seconds: "00", expired: false });
    setHoldExpiryMs(null);
  }, [preloadedBalance, maxRedeemable]);

  useEffect(() => {
    if (step !== "otp_sent" || !transactionTime) return;

    let active = true;
    const tick = () => {
      if (!active) return;
      const next = calcCountdown(transactionTime);
      setCountdown(next);
      if (next.expired) {
        handleCancelAtOTP();
        return;
      }
      timerRef.current = window.setTimeout(tick, 1000);
    };
    tick();

    return () => {
      active = false;
      window.clearTimeout(timerRef.current);
    };
  }, [step, transactionTime, calcCountdown]);

  const handleClose = useCallback(async () => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleCancelAtOTP = useCallback(async () => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSwitchToCashback = useCallback(async () => {
    resetState();
    onSwitchToCashback();
  }, [resetState, onSwitchToCashback]);

  useEffect(() => {
    if (!open) return;
    resetState();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (step !== "loading_balance") return;

    let cancelled = false;
    const loadBalance = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchSuperCoinBalance(identity);
        if (cancelled) return;
        const bal = extractSuperCoinBalance(response);
        setBalance(bal);
        setCoinAmount(Math.min(bal, maxRedeemable));
        setStep("ready");
      } catch (e) {
        if (cancelled) return;
        setError("Unable to load your SuperCoin balance. Please try again.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadBalance();
    return () => {
      cancelled = true;
    };
  }, [open, step, identity]);

  const handleApplyCoins = useCallback(async () => {
    if (!merchantWalletId) {
      setError("SuperCoin merchant wallet is not configured.");
      return;
    }

    if (!orderNumber.trim()) {
      setError("Order is not ready yet. Please try again.");
      return;
    }

    const txnId = `${orderNumber}-SC`;
    setMerchantTransactionId(txnId);
    setIsLoading(true);
    setError(null);

    try {
      const response = await initSuperCoinHold({
        identity,
        merchantWalletId,
        merchantTransactionId: txnId,
        merchantReferenceId: orderNumber,
        amount: coinAmount,
        displayName,
        stampExpiry: Date.now() + 15 * 60 * 1000,
      });

      if (response?.otp) {
        setPrefilledOtp(response.otp);
        setOtp(response.otp);
      }

      setHoldExpiryMs(
        typeof (response as { stampExpiry?: unknown })?.stampExpiry === "number"
          ? Number((response as { stampExpiry?: unknown }).stampExpiry)
          : Date.now() + 15 * 60 * 1000
      );

      if ((response as any)?.transactionTime) {
        setTransactionTime((response as any).transactionTime);
      }

      setStep("otp_sent");
    } catch (e) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to initiate SuperCoin hold. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [identity, merchantWalletId, orderNumber, coinAmount, displayName]);

  const handleVerifyOTP = useCallback(async () => {
    if (!otp.trim() || otp.length < 6) {
      setError("Please enter a valid 6-digit OTP.");
      return;
    }

    if (!merchantTransactionId || !merchantWalletId) {
      setError("Missing transaction context. Please start over.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await authorizeSuperCoinHold({
        identity,
        merchantWalletId,
        merchantTransactionId,
        otp: otp.trim(),
      });

      const state = response?.transactionState?.toUpperCase();
      if (state === "SUCCESSFUL" || state === "SUCCESS") {
        setStep("authorized");
        onAuthorized({
          merchantTransactionId,
          merchantWalletId,
          amount: coinAmount,
          stampExpiry: holdExpiryMs ?? Date.now() + 15 * 60 * 1000,
          transactionTime: transactionTime ?? new Date((holdExpiryMs ?? Date.now() + 15 * 60 * 1000) - 15 * 60 * 1000).toISOString(),
        });
      } else {
        setError(
          response?.message || "OTP verification failed. Please try again."
        );
      }
    } catch (e) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "OTP verification failed. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [otp, merchantTransactionId, merchantWalletId, identity, coinAmount, onAuthorized, holdExpiryMs]);

  const handleCloseAfterAuth = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        {step === "loading_balance" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img src={flipkartSuperCoinIcon} alt="" className="h-6 w-auto" />
                SuperCoins
              </DialogTitle>
              <DialogDescription>Loading your SuperCoin balance...</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#6D5AE6]" />
            </div>
          </>
        )}

        {step === "ready" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <img src={flipkartSuperCoinIcon} alt="" className="h-6 w-auto" />
                Use SuperCoins
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="text-center space-y-2">
                <p className="text-lg">
                  Your SuperCoin balance:{" "}
                  <span className="font-bold">{balance.toFixed(2)} coins</span>
                </p>
                <p className="text-muted-foreground">
                  You can use{" "}
                  <img
                    src={superCoinIcon}
                    alt=""
                    className="inline h-4 w-4 align-middle -mt-px"
                  />{" "}
                  <span className="font-bold">{coinAmount.toFixed(2)} coins</span>
                </p>
                <p className="text-muted-foreground">
                  Save <span className="font-bold text-emerald-600">₹{coinAmount.toFixed(2)}</span> on this order
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <Button
                className="w-full h-11 !bg-[#9747FF] !text-white !border-[#9747FF] shadow-md"
                onClick={handleApplyCoins}
                disabled={isLoading || coinAmount <= 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  "Apply Coins"
                )}
              </Button>
            </div>
          </>
        )}

        {step === "otp_sent" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Verify OTP
              </DialogTitle>
              <DialogDescription className="cart-text-primary">
                Enter the OTP sent to your mobile number to use your SuperCoins.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Countdown timer */}
              {transactionTime && !countdown.expired && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Clock className="h-4 w-4 text-[#9747FF]" />
                  <span className="text-sm font-semibold cart-text-primary">
                    Use your SuperCoins within {countdown.display}
                  </span>
                </div>
              )}
              {countdown.expired && (
                <p className="text-center text-sm font-medium text-red-500">
                  Time expired. Please try again.
                </p>
              )}

              <div className="flex flex-col items-center gap-4">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>

                {prefilledOtp && (
                  <p className="text-xs text-muted-foreground">
                    OTP pre-filled for testing: {prefilledOtp}
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-11 !bg-[#D7BDFF] !text-[#2D2D2D] !border-[#D7BDFF]"
                  onClick={handleCancelAtOTP}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-11 !bg-[#9747FF] !text-white !border-[#9747FF] shadow-md"
                  onClick={handleVerifyOTP}
                  disabled={isLoading || otp.length < 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "authorized" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                SuperCoins Applied
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {coinAmount.toFixed(2)} coins applied
                  </p>
                  <p className="text-muted-foreground">
                    You save{" "}
                    <span className="font-bold text-emerald-600">
                      ₹{coinAmount.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <Button
                className="w-full h-11 !bg-[#9747FF] !text-white !border-[#9747FF] shadow-md"
                onClick={handleCloseAfterAuth}
              >
                Close
              </Button>

              <Button
                variant="link"
                className="w-full text-muted-foreground text-sm"
                onClick={handleSwitchToCashback}
              >
                Switch to Cashback instead
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
