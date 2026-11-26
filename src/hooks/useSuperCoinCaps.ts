import { useEffect, useState } from "react";
import { fetchSuperCoinBrandShares, fetchSuperCoinConfig } from "@/api/supercoinApi";

// Live SuperCoin limits for display copy: the global cap (config) and the
// per-brand share (giftvouchers_brands.supercoin_share_percent). Cached for the
// session so several components do not each hit the API.
const DEFAULT_CAP = 20;
let capCache: number | null = null;
let sharesCache: Record<string, number> | null = null;
let inflight: Promise<void> | null = null;

function load(): Promise<void> {
  if (!inflight) {
    inflight = Promise.all([
      fetchSuperCoinConfig()
        .then((c) => {
          if (typeof c?.capPercent === "number" && c.capPercent > 0) capCache = c.capPercent;
        })
        .catch(() => {}),
      fetchSuperCoinBrandShares().then((s) => {
        sharesCache = s;
      }),
    ]).then(() => undefined);
  }
  return inflight;
}

export function useSuperCoinCaps() {
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    load().then(() => alive && force((n) => n + 1));
    return () => {
      alive = false;
    };
  }, []);
  const globalCap = capCache ?? DEFAULT_CAP;
  const shares = sharesCache ?? {};
  // Percent of voucher value a brand allows in SuperCoin mode (0 = not allowed).
  const percentFor = (brandId?: string | null): number => {
    const s = brandId ? shares[brandId] : undefined;
    if (s === undefined) return globalCap;
    // 100 = the whole voucher value may be paid with SuperCoins.
    return Math.min(s, 100);
  };
  return { globalCap, shares, percentFor };
}
