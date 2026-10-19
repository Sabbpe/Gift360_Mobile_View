// src/hooks/usePaymentMethodFees.ts
import { useEffect, useState } from "react";
import { fetchPaymentMethodFees, type PaymentMethodFee } from "@/api/brandsApi";

let cache: PaymentMethodFee[] | null = null;
let inflight: Promise<PaymentMethodFee[]> | null = null;

/** Active cash payment methods with their fee, loaded once and cached. */
export const usePaymentMethodFees = () => {
  const [methods, setMethods] = useState<PaymentMethodFee[]>(cache ?? []);
  const [loaded, setLoaded] = useState<boolean>(cache !== null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    inflight = inflight ?? fetchPaymentMethodFees();
    inflight
      .then((list) => {
        cache = list;
        if (!cancelled) {
          setMethods(list);
          setLoaded(true);
        }
      })
      .catch(() => {
        inflight = null;
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { methods, loaded };
};

/**
 * Platform fee for a cash amount: percent (or flat) of the cash payable,
 * rounded half-up to the paisa -- same rule as the backend, which is the
 * authority and recomputes it. Zero when there is no cash to pay.
 */
export const computeMethodFee = (method: PaymentMethodFee | undefined, cashAmount: number): number => {
  if (!method || !(cashAmount > 0)) return 0;
  cashAmount = Math.round(cashAmount * 100) / 100;
  const paise =
    method.feeType === "FLAT"
      ? Math.round(method.feeValue * 100)
      : Math.floor((cashAmount * 100 * method.feeValue) / 100 + 0.5 + 1e-9);
  return paise / 100;
};
