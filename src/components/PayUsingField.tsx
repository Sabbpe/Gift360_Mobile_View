// components/PayUsingField.tsx
// ONE checkout button (Swiggy-style): "PAY USING ▲" + selected method on the
// left, "Pay ₹XX" on the right, all inside a single tappable control. Tapping
// anywhere opens the PayUsingSheet, where the app / QR / card is chosen and the
// payment actually starts.
import { ChevronUp, Loader2, Wallet } from "lucide-react";

export const payMethodSubtext = (code?: string | null): string => {
  switch ((code ?? "").trim().toUpperCase()) {
    case "UPI":
      return "Google Pay, PhonePe, Paytm, CRED, BHIM";
    case "DC":
      return "Visa, Mastercard, RuPay";
    case "CC":
      return "Visa, Mastercard, Amex";
    case "NB":
      return "All major banks";
    default:
      return "Choose how you want to pay";
  }
};

interface Props {
  label: string;
  subtext?: string;
  /** e.g. "Pay ₹723.00" */
  amountLabel: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export default function PayUsingField({
  label,
  subtext,
  amountLabel,
  onClick,
  disabled = false,
  loading = false,
  className = "",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl bg-[linear-gradient(90deg,#9747FF,#5B2B99)] p-3 text-left text-white shadow-lg shadow-[rgba(108,92,231,0.25)] transition-all active:scale-[0.99] disabled:opacity-50 ${className}`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-white">
        <Wallet className="h-5 w-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white/75">
          Pay using
          <ChevronUp className="h-3 w-3" />
        </span>
        <span className="block truncate text-[14px] font-bold leading-tight text-white">
          {label}
        </span>
        {subtext && (
          <span className="block truncate text-[10px] font-medium text-white/70">{subtext}</span>
        )}
      </span>

      <span className="flex shrink-0 items-center gap-1.5 text-[17px] font-extrabold text-white">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Please wait…" : amountLabel}
      </span>
    </button>
  );
}
