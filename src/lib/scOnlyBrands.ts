// Central decision helper: which brands must use the Convert Coins (SuperCoin
// burn) flow instead of cash. Sourced from the backend configuration
// (giftvouchers_brands.supercoin_pay_mode via GET /v1/supercoin/modal-brands),
// so every entry point (Recently Used, Add to Cart, Buy Now, ...) agrees and
// the answer survives logout / login / page refresh.
import { fetchSuperCoinModalBrands } from "@/api/supercoinApi";

const CACHE_KEY = "gift360.scOnlyBrands";
const CACHE_TTL_MS = 10 * 60 * 1000;

/** Existing convert-coins page; it mounts the SuperCoins burn flow. */
export const CONVERT_COINS_PATH = "/supercoin-voucher";

let cachedIds: Set<string> | null = null;
let loadedAt = 0;
let inFlight: Promise<Set<string>> | null = null;

const isFresh = (at: number) => Date.now() - at <= CACHE_TTL_MS;

const readSessionCache = (): { at: number; ids: string[] } | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: unknown; ids?: unknown };
    const at = Number(parsed?.at);
    const ids = Array.isArray(parsed?.ids) ? (parsed.ids as string[]) : null;
    if (!Number.isFinite(at) || !ids) return null;
    return { at, ids };
  } catch {
    return null;
  }
};

const writeSessionCache = (ids: string[]) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), ids }));
  } catch {
    // Storage unavailable (private mode): keep the in-memory copy only.
  }
};

/**
 * Loads (or refreshes) the SC_ONLY brand ids. The endpoint is the same filter
 * the backend enforces: supercoin_modal_enabled = 1, show_on_frontend = 1 and
 * a matching brand_id/brand_code in giftvouchers_public.
 */
export const ensureScOnlyBrandsLoaded = (force = false): Promise<Set<string>> => {
  if (!force && cachedIds && isFresh(loadedAt)) return Promise.resolve(cachedIds);
  if (!force && inFlight) return inFlight;

  inFlight = fetchSuperCoinModalBrands()
    .then((brands) => {
      const ids = new Set(
        (brands || [])
          .filter((b) => b && b.payMode === "SC_ONLY" && b.brandId)
          .map((b) => String(b.brandId))
      );
      cachedIds = ids;
      loadedAt = Date.now();
      writeSessionCache([...ids]);
      return ids;
    })
    .catch(() => {
      // Fail open: the backend still blocks cash payment for SC_ONLY brands.
      if (!cachedIds) cachedIds = readSessionCache()?.ids ? new Set(readSessionCache()!.ids) : new Set();
      return cachedIds;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

/** Async membership check used by click handlers before opening a flow. */
export const isScOnlyBrand = async (
  brandId?: string | null,
  refresh = false
): Promise<boolean> => {
  if (!brandId) return false;
  const ids = await ensureScOnlyBrandsLoaded(refresh);
  return ids.has(brandId);
};

/**
 * Synchronous check for hot paths (e.g. addToCart). Uses the in-memory or
 * session cache only; returns false until the config has loaded.
 */
export const isScOnlyBrandSync = (brandId?: string | null): boolean => {
  if (!brandId) return false;
  if (!cachedIds) {
    const session = readSessionCache();
    if (session) {
      cachedIds = new Set(session.ids);
      loadedAt = session.at;
    }
  }
  return cachedIds?.has(brandId) ?? false;
};
