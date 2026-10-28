// lib/upiIntent.ts
// UPI-intent helpers: opening the right app per platform, resuming after a
// reload, and reacting when the user comes back from the UPI app.

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
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
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

/**
 * Per-app iOS URLs are just a prefix swap of OUR backend deeplink — the query
 * string (pa/pn/mc/am/tr/tid/orgid/mode) always comes from the backend.
 */
export const buildHostAppUrl = (deeplink: string, prefix?: string): string => {
  if (!prefix) return deeplink;
  const queryAt = deeplink.indexOf("?");
  if (queryAt < 0) return deeplink;
  return `${prefix}${deeplink.slice(queryAt + 1)}`;
};

export const openUpiApp = (
  deeplink: string,
  hostUrlsForIOS?: Record<string, string>,
  app?: string
): void => {
  const prefix = app && hostUrlsForIOS ? hostUrlsForIOS[app] : undefined;
  const url = buildHostAppUrl(deeplink, prefix);
  // A real user gesture is required for iOS; this is always called from a tap
  // (or immediately after create on Android).
  window.location.href = url;
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
