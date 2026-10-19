// src/hooks/useSuperCoinEarnEstimate.ts
import { useEffect, useRef, useState } from "react";
import { fetchEarnEstimate, type EarnEstimateItem } from "@/api/earnEstimateApi";

const DEBOUNCE_MS = 350;

/**
 * SuperCoins the cart will earn, from the backend. Returns null when it is off, when
 * there is nothing to earn on, or when the call fails -- callers hide the line then,
 * rather than showing a guessed number. Keeps the last value while a new one loads.
 */
export const useSuperCoinEarnEstimate = (
  items: EarnEstimateItem[],
  cashPayable: number,
  enabled: boolean
): number | null => {
  const [coins, setCoins] = useState<number | null>(null);
  const requestId = useRef(0);

  const cash = Math.round(Math.max(0, cashPayable) * 100) / 100;
  const key = JSON.stringify(items.map((i) => [i.brandId, i.lineTotal])) + "|" + cash;

  useEffect(() => {
    if (!enabled || cash <= 0 || items.length === 0) {
      setCoins(null);
      return;
    }
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      fetchEarnEstimate(items, cash)
        .then((estimate) => {
          if (requestId.current === id) setCoins(estimate.coins);
        })
        .catch(() => {
          if (requestId.current === id) setCoins(null);
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return enabled ? coins : null;
};
