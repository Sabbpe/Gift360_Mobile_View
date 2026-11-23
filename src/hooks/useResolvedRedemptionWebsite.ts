import { useEffect, useState } from "react";
import { getBrandDetails } from "@/api/brandDetailsApi";

/**
 * Resolves a brand's redemption website for the "Redeem on website" CTA.
 *
 * Newer orders carry the catalog link in the order-item meta (stamped at
 * order creation). Older orders predate that, so we fall back to
 * POST /brands/{brandId} — but only when `enabled` is true (i.e. the caller
 * actually needs it, such as an expanded/revealed card), so list screens
 * don't fire one request per order.
 */
export function useResolvedRedemptionWebsite(
  metaWebsite: string | null | undefined,
  brandId: string | null | undefined,
  enabled: boolean
): string | null {
  const [fetched, setFetched] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || metaWebsite || !brandId) return;
    let cancelled = false;
    getBrandDetails(brandId)
      .then((b) => {
        if (!cancelled) setFetched(b.RedemptionWebsite || null);
      })
      .catch(() => {
        /* CTA simply stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, metaWebsite, brandId]);

  const href = (metaWebsite || fetched || "").trim();
  return /^https?:\/\//i.test(href) ? href : null;
}
