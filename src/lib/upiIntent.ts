// lib/upiIntent.ts
// UPI-intent helpers: opening the right app per platform, resuming after a
// reload, and reacting when the user comes back from the UPI app.
import { IOS_UPI_APPS } from "@/lib/iosUpiApps";

export interface PendingUpiIntent {
  orderNumber: string;
  merchantRequestId: string;
  deeplink: string;
  hostUrlsForIOS?: Record<string, string>;
  amount?: string;
  startedAt: number;
}

const PENDING_KEY = "gift360.upiIntent.pending";

/** Apps offered on iOS (Android uses the system chooser). */
export const UPI_APPS = ["Gpay", "PhonePe", "Paytm", "Cred", "BHIM"] as const;
export type UpiApp = (typeof UPI_APPS)[number];

export const isIOS = (): boolean =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const savePendingIntent = (pending: PendingUpiIntent): void => {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    /* storage unavailable - polling still works while the page is open */
  }
};

export const loadPendingIntent = (): PendingUpiIntent | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingUpiIntent;
    return parsed && parsed.orderNumber && parsed.deeplink ? parsed : null;
  } catch {
    return null;
  }
};

export const clearPendingIntent = (): void => {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
};

export const isFreshPendingIntent = (pending: PendingUpiIntent, minutes = 15): boolean =>
  Date.now() - pending.startedAt < minutes * 60_000;

/** Per-app iOS scheme prefixes (single source of truth, mirrors Info.plist). */
const IOS_SCHEME_PREFIXES: Record<string, string> = Object.fromEntries(
  IOS_UPI_APPS.map((app) => [app.key, app.scheme])
);

/**
 * iOS must NEVER launch the generic `upi://` scheme: iOS has no UPI chooser, so
 * whatever app claims `upi://` (e.g. WhatsApp) receives the payment link.
 */
const isGenericUpi = (url: string): boolean => /^upi:\/\//i.test(url.trim());

/**
 * Per-app iOS URLs are just a prefix swap of OUR backend deeplink — the query
 * string (pa/pn/mc/am/tr/tid/orgid/mode) always comes from the backend.
 * Returns null when there is nothing safe to launch.
 */
export const buildHostAppUrl = (deeplink: string, prefix?: string): string | null => {
  if (!prefix) return null;
  const queryAt = deeplink.indexOf("?");
  if (queryAt < 0) return null;
  return `${prefix}${deeplink.slice(queryAt + 1)}`;
};

/**
 * Resolves the URL to open for the current platform.
 * - Any platform, app chosen: ONLY that app's scheme (prefix swap).
 * - Android/desktop, no app chosen: the backend deeplink (system chooser).
 * - iOS, no app chosen: null (show our own app list + QR; never `upi://`).
 */
export const resolveUpiUrl = (
  deeplink: string,
  hostUrlsForIOS?: Record<string, string>,
  app?: string,
  ios: boolean = isIOS()
): string | null => {
  const chosenApp = app?.trim();
  if (!chosenApp) {
    return ios ? null : deeplink;
  }
  const fromBackend = hostUrlsForIOS?.[chosenApp];
  const candidate = fromBackend && !isGenericUpi(fromBackend) ? fromBackend : undefined;
  const prefix = candidate ?? IOS_SCHEME_PREFIXES[chosenApp];
  if (!prefix || isGenericUpi(prefix)) return null;
  return buildHostAppUrl(deeplink, prefix);
};

/** Navigates to a URL from a user gesture. */
export const launchUrl = (url: string): boolean => {
  if (!url) return false;
  window.location.href = url;
  return true;
};

/**
 * Opens the payment app. Returns false when no safe URL could be built (the
 * sheet then keeps showing our app buttons + QR instead).
 */
export const openUpiApp = (
  deeplink: string,
  hostUrlsForIOS?: Record<string, string>,
  app?: string
): boolean => {
  const url = resolveUpiUrl(deeplink, hostUrlsForIOS, app);
  if (!url) return false;
  // A real user gesture is required for iOS; this is always called from a tap
  // (or immediately after create on Android).
  return launchUrl(url);
};

/** Fires whenever the user returns to this page (tab focus / app resume). */
export const registerUpiReturnListener = (onReturn: () => void): (() => void) => {
  const onVisible = () => {
    if (document.visibilityState === "visible") onReturn();
  };
  const onShow = () => onReturn();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onShow);
  window.addEventListener("pageshow", onShow);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onShow);
    window.removeEventListener("pageshow", onShow);
  };
};
