// lib/iosUpiApps.ts
// UPI apps supported on iOS + installed-app detection helpers (pure functions,
// fully unit-testable). The iOS app schemes must stay identical to the backend
// contract; the payment query itself always comes from the backend deeplink.
import type { UpiApp } from "@/lib/upiIntent";

export interface IosUpiApp {
  /** Same keys the backend uses in hostUrlsForIOS (Gpay, PhonePe, …). */
  key: UpiApp;
  label: string;
  /** Full iOS scheme prefix used to open the app (query is appended as-is). */
  scheme: string;
  /** Scheme root passed to UIApplication.canOpenURL. */
  probe: string;
}

/**
 * Order is the display order. NEVER launch automatically on iOS — the user must
 * pick one of the detected apps explicitly.
 */
export const IOS_UPI_APPS: IosUpiApp[] = [
  { key: "Gpay", label: "Google Pay", scheme: "tez://upi/pay?", probe: "tez://" },
  { key: "PhonePe", label: "PhonePe", scheme: "phonepe://pay?", probe: "phonepe://" },
  { key: "Paytm", label: "Paytm", scheme: "paytmmp://pay?", probe: "paytmmp://" },
  { key: "Cred", label: "CRED", scheme: "credpay://upi/pay?", probe: "credpay://" },
  { key: "BHIM", label: "BHIM", scheme: "bhim://pay?", probe: "bhim://" },
];

/** Probes one scheme; resolves true only when the OS reports it can open it. */
export type ProbeFn = (probe: string) => Promise<boolean>;

/**
 * Probes every supported app in parallel and returns ONLY the installed ones,
 * preserving display order. A probe that throws is treated as "not installed"
 * (detection is best effort — callers must fall back to QR).
 */
export const detectInstalledUpiApps = async (
  probe: ProbeFn,
  apps: IosUpiApp[] = IOS_UPI_APPS
): Promise<IosUpiApp[]> => {
  const results = await Promise.all(
    apps.map(async (app) => {
      try {
        return (await probe(app.probe)) ? app : null;
      } catch {
        return null;
      }
    })
  );
  return results.filter((app): app is IosUpiApp => app !== null);
};

/** True when probing itself is impossible/blank — used to show the QR-only path. */
export const needsQrOnlyFallback = (apps: IosUpiApp[]): boolean => apps.length === 0;
