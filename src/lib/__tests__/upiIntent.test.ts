import { describe, expect, it } from "vitest";
import { buildHostAppUrl, resolveUpiUrl } from "@/lib/upiIntent";

const DEEPLINK =
  "upi://pay?pa=tfpuat@fblpay&pn=SabbPe&mc=5411&am=1.01&cu=INR&mode=05&tr=ORD123&tid=TXN9&orgid=000000";

const QUERY = DEEPLINK.slice(DEEPLINK.indexOf("?") + 1);

const IOS_APPS = [
  ["Gpay", "tez://upi/pay?"],
  ["PhonePe", "phonepe://pay?"],
  ["Paytm", "paytmmp://pay?"],
  ["Cred", "credpay://upi/pay?"],
  ["BHIM", "bhim://pay?"],
] as const;

describe("buildHostAppUrl (iOS per-app launch)", () => {
  it("only swaps the scheme prefix and preserves every payment parameter", () => {
    expect(buildHostAppUrl(DEEPLINK, "tez://upi/pay?")).toBe(`tez://upi/pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "phonepe://pay?")).toBe(`phonepe://pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "paytmmp://pay?")).toBe(`paytmmp://pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "bhim://pay?")).toBe(`bhim://pay?${QUERY}`);
  });

  it("keeps CRED's different path intact", () => {
    const url = buildHostAppUrl(DEEPLINK, "credpay://upi/pay?");
    expect(url).toBe(`credpay://upi/pay?${QUERY}`);
  });

  it("never rewrites pa/pn/am/tr/tid/mode/orgid", () => {
    const url = buildHostAppUrl(DEEPLINK, "tez://upi/pay?")!;
    for (const param of ["pa=", "pn=", "am=1.01", "tr=ORD123", "tid=TXN9", "mode=05", "orgid=000000"]) {
      expect(url).toContain(param);
    }
  });

  it("returns null when there is no safe prefix or no query string", () => {
    expect(buildHostAppUrl(DEEPLINK)).toBeNull();
    expect(buildHostAppUrl("tez://upi/pay", "tez://upi/pay?")).toBeNull();
    expect(buildHostAppUrl(DEEPLINK, "")).toBeNull();
  });
});

describe("resolveUpiUrl (iOS must never open the generic upi:// scheme)", () => {
  it("builds the per-app iOS URL from the backend query for every supported app", () => {
    for (const [app, prefix] of IOS_APPS) {
      expect(resolveUpiUrl(DEEPLINK, undefined, app, true)).toBe(`${prefix}${QUERY}`);
    }
  });

  it("never returns a upi:// URL on iOS, even if the backend sends a generic prefix", () => {
    for (const [app] of IOS_APPS) {
      const url = resolveUpiUrl(DEEPLINK, { [app]: "upi://pay?" }, app, true);
      expect(url).not.toBeNull();
      expect(url!.startsWith("upi://")).toBe(false);
    }
  });

  it("prefers a backend-provided app-specific prefix", () => {
    expect(resolveUpiUrl(DEEPLINK, { Gpay: "tez://upi/pay?" }, "Gpay", true))
      .toBe(`tez://upi/pay?${QUERY}`);
  });

  it("returns null on iOS when no app was selected (sheet shows its own list + QR)", () => {
    expect(resolveUpiUrl(DEEPLINK, undefined, undefined, true)).toBeNull();
    expect(resolveUpiUrl(DEEPLINK, { Gpay: "tez://upi/pay?" }, undefined, true)).toBeNull();
  });

  it("returns null for an unknown app on iOS", () => {
    expect(resolveUpiUrl(DEEPLINK, undefined, "WhatsApp", true)).toBeNull();
  });

  it("uses the chosen app scheme on Android/desktop too (no system chooser)", () => {
    for (const [app, prefix] of IOS_APPS) {
      expect(resolveUpiUrl(DEEPLINK, undefined, app, false)).toBe(`${prefix}${QUERY}`);
    }
  });

  it("keeps the generic backend deeplink only when NO app is chosen (Android/desktop)", () => {
    expect(resolveUpiUrl(DEEPLINK, undefined, undefined, false)).toBe(DEEPLINK);
  });

  it("returns null for an unknown app on Android/desktop", () => {
    expect(resolveUpiUrl(DEEPLINK, undefined, "SomeOtherUpi", false)).toBeNull();
  });
});
