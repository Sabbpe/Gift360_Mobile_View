/**
 * Remembers where a logged-out visitor was headed (e.g. /supercoin-voucher from the
 * Flipkart entry) so Login/Register can send them back there after OTP verification.
 * sessionStorage only; every access is wrapped because it can throw in WebViews.
 */
const REDIRECT_KEY = "gift360_post_login_redirect";
const MOBILE_KEY = "gift360_prefill_mobile";

/** Only same-site paths; never /login or /register (would loop) and never //host. */
const isSafePath = (p: unknown): p is string =>
  typeof p === "string" &&
  p.startsWith("/") &&
  !p.startsWith("//") &&
  !/^\/(login|register)(\/|\?|$)/.test(p);

export function savePostLoginRedirect(path: string | null | undefined): void {
  if (!isSafePath(path)) return;
  try { sessionStorage.setItem(REDIRECT_KEY, path); } catch { /* ignore */ }
}

export function peekPostLoginRedirect(): string | null {
  try {
    const v = sessionStorage.getItem(REDIRECT_KEY);
    return isSafePath(v) ? v : null;
  } catch { return null; }
}

/** Returns the saved destination (and clears it), or the fallback. */
export function consumePostLoginRedirect(fallback = "/"): string {
  const v = peekPostLoginRedirect();
  try { sessionStorage.removeItem(REDIRECT_KEY); } catch { /* ignore */ }
  return v ?? fallback;
}

/** Hand a typed mobile number from Login to Register (and back) so it is not retyped. */
export function savePrefillMobile(mobile: string): void {
  if (!/^[0-9]{10}$/.test(mobile)) return;
  try { sessionStorage.setItem(MOBILE_KEY, mobile); } catch { /* ignore */ }
}

export function consumePrefillMobile(): string {
  try {
    const v = sessionStorage.getItem(MOBILE_KEY) ?? "";
    sessionStorage.removeItem(MOBILE_KEY);
    return /^[0-9]{10}$/.test(v) ? v : "";
  } catch { return ""; }
}
