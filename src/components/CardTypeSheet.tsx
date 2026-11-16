import { ChevronRight, CreditCard, Landmark, Wallet, X } from "lucide-react";
import { computeMethodFee } from "@/hooks/usePaymentMethodFees";
import type { PaymentMethodFee } from "@/api/brandsApi";

interface CardTypeSheetProps {
  open: boolean;
  methods: PaymentMethodFee[];
  cashAmount: number;
  onClose: () => void;
  onSelect: (code: string) => void;
}

const money = (value: number): string => `₹${value.toFixed(2)}`;

const iconFor = (code: string) => {
  const normalized = code.trim().toUpperCase();
  if (normalized === "DC") return Wallet;
  if (normalized === "NB") return Landmark;
  return CreditCard;
};

export default function CardTypeSheet({
  open,
  methods,
  cashAmount,
  onClose,
  onSelect,
}: CardTypeSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose payment method"
        className="relative max-h-[80vh] w-[min(100%,420px)] overflow-y-auto rounded-[26px] bg-white shadow-[0_24px_70px_rgba(33,24,74,0.28)] animate-[scale-in_0.2s_ease-out]"
      >
        <div className="relative bg-[linear-gradient(135deg,#9747FF_0%,#7C3AED_45%,#5B2B99_100%)] px-5 pb-5 pt-5 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to payment options"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/15 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Pay using
          </p>
          <h2 className="mt-0.5 text-[19px] font-bold leading-tight">
            Debit / Credit / NetBanking
          </h2>
        </div>

        <div className="space-y-2 px-5 pb-6 pt-4">
          {methods.map((method) => {
            const fee = computeMethodFee(method, cashAmount);
            const Icon = iconFor(method.code);

            return (
              <button
                key={method.code}
                type="button"
                onClick={() => onSelect(method.code)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#E2D9FF] bg-white px-3 py-3 text-left shadow-sm active:scale-[0.99]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F7F2FF] text-[#5B2B99]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-bold text-[#3B1E78]">
                    {method.label}
                  </span>
                  <span className="block text-[10px] font-semibold text-gray-500">
                    Fee {money(fee)}
                  </span>
                </span>
                <span className="flex items-center gap-1 text-[12px] font-extrabold text-[#5B2B99]">
                  {money(Math.round((cashAmount + fee) * 100) / 100)}
                  <ChevronRight className="h-4 w-4 text-[#7C3AED]" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
