import { Hourglass, Loader2 } from "lucide-react";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";

export const SUPERCOIN_CLAIM_URL = "https://flipkartsupercoin.woohoo.in/claimReward";

type Props = {
  /** SuperCoins the customer must spend for the selected voucher (already uses the live burn ratio). */
  coinsNeeded: number;
  /** Voucher value in INR for the current selection. */
  voucherValue: number;
  balance?: number;
  loggedIn: boolean;
  balanceLoading: boolean;
  /** Amount is valid and the balance covers it. */
  canConvert: boolean;
  busy: boolean;
  paused: boolean;
  pausedMessage: string;
  onConvert: () => void;
  onLogin: () => void;
};

const fmt = (n: number) => n.toLocaleString("en-IN");

export default function SuperCoinExpiryCard({
  coinsNeeded,
  voucherValue,
  loggedIn,
  balanceLoading,
  canConvert,
  busy,
  paused,
  pausedMessage,
  onConvert,
  onLogin,
}: Props) {
  let label = "Convert & extend";
  let disabled = false;
  let onClick = onConvert;
  let hint: string | null = null;

  if (paused) {
    label = "Temporarily unavailable";
    disabled = true;
    hint = pausedMessage;
  } else if (!loggedIn) {
    label = "Login to extend";
    onClick = onLogin;
  } else if (balanceLoading) {
    label = "Checking your balance...";
    disabled = true;
  } else if (!canConvert) {
    label = "Not enough SuperCoins";
    disabled = true;
    hint = `You need ${fmt(coinsNeeded)} SuperCoins for a ₹${fmt(voucherValue)} voucher. Check your balance in the Flipkart app.`;
  }

  return (
    <div
      className="mt-4 mb-3 overflow-hidden rounded-[16px] bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] p-3.5 text-white shadow-[0_6px_20px_rgba(91,43,153,0.35)]"
      data-testid="supercoin-expiry-card"
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
          <Hourglass className="h-4 w-4 text-[#f7d46b]" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-tight">
            Extend your SuperCoins&apos; expiry by 6&nbsp;months
          </p>
          <p className="mt-1 text-[11px] leading-snug text-white/80">
            Convert them into a voucher, then redeem it for fresh SuperCoins.
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-[10px] bg-white/12 px-2 py-1.5 text-[11px] font-semibold">
        <img src={superCoinIcon} alt="" className="h-3.5 w-3.5" />
        <span>{fmt(coinsNeeded)} coins</span>
        <span className="text-white/60">→</span>
        <span>₹{fmt(voucherValue)} voucher</span>
      </div>

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || busy}
        className="mt-2.5 flex h-[40px] w-full items-center justify-center gap-2 rounded-[10px] bg-white text-[12px] font-bold text-[#5B2B99] shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Please wait...
          </>
        ) : (
          label
        )}
      </button>

      {hint && <p className="mt-2 text-center text-[10px] leading-snug text-white/80">{hint}</p>}
    </div>
  );
}
