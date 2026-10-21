import { cn } from "@/lib/utils";
import { computeMethodFee } from "@/hooks/usePaymentMethodFees";
import type { PaymentMethodFee } from "@/api/brandsApi";

const SUBTEXT: Record<string, string> = {
  UPI: "GPay, PhonePe, Paytm, BHIM",
  DC: "Visa, Mastercard, RuPay",
  CC: "Visa, Mastercard, Amex",
  NB: "All major banks",
};

const feeLabel = (m: PaymentMethodFee) =>
  m.feeType === "FLAT" ? `₹${m.feeValue} flat fee` : `${m.feeValue}% fee`;

interface Props {
  methods: PaymentMethodFee[];
  value: string;
  onChange: (code: string) => void;
  /** Cash the customer pays, before the platform fee. */
  cashAmount: number;
  disabled?: boolean;
  className?: string;
  /** Also show "Total to pay" (cash + fee) under the cards, for screens with no breakdown of their own. */
  showTotal?: boolean;
}

/** Radio cards for the cash payment method; each shows its platform fee in rupees. */
export function PaymentMethodSelector({ methods, value, onChange, cashAmount, disabled, className, showTotal }: Props) {
  if (methods.length === 0 || !(cashAmount > 0)) return null;

  const fees = methods.map((m) => computeMethodFee(m, cashAmount));
  const lowest = Math.min(...fees);

  return (
    <div className={cn("cart-color-system space-y-2", className)} role="radiogroup" aria-label="Payment method">
      <p className="text-xs text-center font-semibold uppercase tracking-wider cart-text-secondary">
        Choose how to pay
      </p>
      {methods.map((m, i) => {
        const selected = m.code === value;
        return (
          <button
            key={m.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(m.code)}
            className={cn(
              "w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all",
              "disabled:opacity-60",
              selected
                ? "border-[var(--cart-primary)] bg-[var(--cart-primary)]/10"
                : "border-black/10 dark:border-white/15 hover:border-[var(--cart-primary)]/50"
            )}
          >
            <span
              className={cn(
                "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center",
                selected ? "border-[var(--cart-primary)]" : "border-muted-foreground/50"
              )}
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-[var(--cart-primary)]" />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 text-sm font-semibold cart-text-primary">
                {m.label}
                {fees[i] === lowest && methods.length > 1 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Lowest fee
                  </span>
                )}
              </span>
              <span className="block text-xs cart-text-secondary">{SUBTEXT[m.code] ?? ""}</span>
            </span>
            <span className="text-right shrink-0">
              <span className="block text-sm font-semibold cart-text-primary">+₹{fees[i].toFixed(2)}</span>
              <span className="block text-[12px] cart-text-secondary">{feeLabel(m)}</span>
            </span>
          </button>
        );
      })}
      {showTotal && (
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-sm font-semibold cart-text-primary">Total to pay</span>
          <span className="text-lg font-extrabold text-[var(--cart-primary)]">
            ₹{(Math.round(cashAmount * 100) / 100 + (fees[Math.max(0, methods.findIndex((m) => m.code === value))] ?? 0)).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}
