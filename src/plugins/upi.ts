// plugins/upi.ts
// Typed bridge to the app-local Capacitor plugin `Upi` (ios/App/App/UpiPlugin.swift).
// Every call degrades gracefully when the plugin is unavailable (web build,
// Safari/PWA, Android) - callers must treat a failure as "unknown / not installed".
import { registerPlugin } from "@capacitor/core";

interface UpiNativePlugin {
  isInstalled(options: { probe: string }): Promise<{ installed: boolean }>;
  open(options: { url: string }): Promise<void>;
}

export const Upi = registerPlugin<UpiNativePlugin>("Upi");

/** Best-effort availability probe. Never throws. */
export const probeUpiApp = async (probe: string): Promise<boolean> => {
  try {
    const result = await Upi.isInstalled({ probe });
    return result?.installed === true;
  } catch {
    return false;
  }
};

/** Opens a UPI URL through the OS. Returns false when it could not be opened. */
export const openUpiUrlNative = async (url: string): Promise<boolean> => {
  try {
    await Upi.open({ url });
    return true;
  } catch {
    return false;
  }
};
