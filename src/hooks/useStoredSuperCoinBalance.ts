// hooks/useStoredSuperCoinBalance.ts
import { useQuery } from "@tanstack/react-query";
import { brandApi } from "@/lib/valuedesignApi";
import {
  extractSuperCoinBalance,
  fetchSuperCoinBalance,
  normalizeMobileToE164,
} from "@/api/supercoinApi";

/**
 * SuperCoins balance shown in the cashback-points card.
 *
 * Primary source: client_profile.supercoin_balance (V55) — the snapshot the
 * app persists after every /balance fetch while logged in. When the snapshot
 * is still empty (never fetched), falls back to one live /balance call, which
 * also persists itself, so the card is populated from then on.
 */
export const useStoredSuperCoinBalance = (clientId?: string, mobile?: string | null) => {
  return useQuery<number | "NA" | null>({
    queryKey: ["sc-balance", clientId],
    enabled: !!clientId,
    staleTime: 60_000,
    retry: 1,
    queryFn: async () => {
      if (!clientId) return null;
      const toNumber = (value: number | string): number | null => {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
      };
      try {
        const res = await brandApi.get<{ supercoinBalance?: number | string | null }>(
          `/v1/clients/${clientId}/supercoin-balance`
        );
        const stored = res.data?.supercoinBalance;
        if (typeof stored === "string") {
          if (stored.trim().toUpperCase() === "NA") return "NA";
          const n = toNumber(stored);
          if (n !== null) return n;
        } else if (stored !== null && stored !== undefined) {
          const n = toNumber(stored);
          if (n !== null) return n;
        }
      } catch {
        // unknown client / column missing — fall through to the live balance
      }
      const normalized = normalizeMobileToE164(mobile);
      if (!normalized) return null;
      try {
        const live = await fetchSuperCoinBalance({ identifier: normalized, type: "MOBILE" });
        return extractSuperCoinBalance(live);
      } catch (err) {
        // fetchSuperCoinBalance already persisted "NA" on a 404
        const status = (err as { response?: { status?: number } })?.response?.status;
        return status === 404 ? "NA" : null;
      }
    },
  });
};
