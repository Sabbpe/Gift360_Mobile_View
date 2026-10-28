import { describe, expect, it } from "vitest";
import {
  IOS_UPI_APPS,
  detectInstalledUpiApps,
  needsQrOnlyFallback,
} from "@/lib/iosUpiApps";

describe("detectInstalledUpiApps (native iOS probing)", () => {
  it("returns ONLY the apps the OS reports as installed, in display order", async () => {
    const installed = new Set(["tez://", "phonepe://"]);
    const apps = await detectInstalledUpiApps(async (probe) => installed.has(probe));

    expect(apps.map((app) => app.key)).toEqual(["Gpay", "PhonePe"]);
  });

  it("returns an empty list (QR-only fallback) when nothing is installed", async () => {
    const apps = await detectInstalledUpiApps(async () => false);

    expect(apps).toEqual([]);
    expect(needsQrOnlyFallback(apps)).toBe(true);
  });

  it("treats a failing probe as not-installed and never throws", async () => {
    const apps = await detectInstalledUpiApps(async (probe) => {
      if (probe === "tez://") throw new Error("canOpenURL failed");
      return probe === "bhim://";
    });

    expect(apps.map((app) => app.key)).toEqual(["BHIM"]);
  });

  it("keeps the exact schemes the native shell must query", () => {
    expect(IOS_UPI_APPS.map((app) => app.probe)).toEqual([
      "tez://",
      "phonepe://",
      "paytmmp://",
      "credpay://",
      "bhim://",
    ]);
    // CRED has a different path than the other apps.
    expect(IOS_UPI_APPS.find((app) => app.key === "Cred")?.scheme).toBe("credpay://upi/pay?");
  });
});
