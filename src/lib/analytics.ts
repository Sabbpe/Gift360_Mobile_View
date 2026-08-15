// Thin wrapper around gtag.js — kept in one place so any future analytics
// change (a second GA property, adding Meta Pixel, etc.) touches just this
// file instead of every page/component that fires an event.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = "G-5R8D8NMYCQ";

function gtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/** Call on every route change (wouter's useLocation) — SPA navigations
 *  don't reload the page, so GA never sees them unless told explicitly. */
export function trackPageView(path: string, title?: string) {
  if (!gtagAvailable()) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    page_location: window.location.href,
    send_to: GA_MEASUREMENT_ID,
  });
}

/** Generic event tracker for anything beyond pageviews — add to cart,
 *  purchase, signup, etc. Name/params follow GA4's recommended event schema
 *  where one exists (see comments on each call site that uses this). */
export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (!gtagAvailable()) return;
  window.gtag("event", eventName, params);
}
