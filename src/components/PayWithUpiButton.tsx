// components/PayWithUpiButton.tsx
// Secondary checkout button: pay through the Juspay UPI-intent gateway.
// The sibling (primary) button keeps the Easebuzz hosted flow with its
// UPI / NetBanking / Debit / Credit selector.
import { Smartphone } from "lucide-react";

interface Props {
  onClick: () => void;
  disabled?: boolean;
  amount?: number;
  className?: string;
  label?: string;
}

export default function PayWithUpiButton({
  onClick,
  disabled = false,
  amount,
  className = "",
  label,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-[#E2D9FF] bg-white text-[13px] font-bold text-[#5B2B99] shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 ${className}`}
    >
      <Smartphone className="h-4 w-4" />
      {label ?? (amount != null ? `Pay ₹${amount.toFixed(2)} via UPI (Juspay)` : "Pay via UPI (Juspay)")}
    </button>
  );
}
