import { describe, expect, it } from "vitest";
import { buildHostAppUrl } from "@/lib/upiIntent";

const DEEPLINK =
  "upi://pay?pa=tfpuat@fblpay&pn=SabbPe&mc=5411&am=1.01&cu=INR&mode=05&tr=ORD123&tid=TXN9&orgid=000000";

const QUERY = DEEPLINK.slice(DEEPLINK.indexOf("?") + 1);

describe("buildHostAppUrl (iOS per-app launch)", () => {
  it("only swaps the scheme prefix and preserves every payment parameter", () => {
    expect(buildHostAppUrl(DEEPLINK, "tez://upi/pay?")).toBe(`tez://upi/pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "phonepe://pay?")).toBe(`phonepe://pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "paytmmp://pay?")).toBe(`paytmmp://pay?${QUERY}`);
    expect(buildHostAppUrl(DEEPLINK, "bhim://pay?")).toBe(`bhim://pay?${QUERY}`);
  });

  it("keeps CRED's different path intact", () => {
    const url = buildHostAppUrl(DEEPLINK, "credpay://upi/pay?");
    expect(url.startsWith("credpay://upi/pay?pa=")).toBe(true);
    expect(url).toBe(`credpay://upi/pay?${QUERY}`);
  });

  it("never rewrites pa/pn/am/tr/tid/mode/orgid", () => {
    const url = buildHostAppUrl(DEEPLINK, "tez://upi/pay?");
    for (const param of ["pa=", "pn=", "am=1.01", "tr=ORD123", "tid=TXN9", "mode=05", "orgid=000000"]) {
      expect(url).toContain(param);
    }
  });

  it("falls back to the backend string when no prefix is supplied", () => {
    expect(buildHostAppUrl(DEEPLINK)).toBe(DEEPLINK);
  });
});
