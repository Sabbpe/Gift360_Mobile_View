// lib/ios.ts
// Platform detection for the payment UI.
//
// Native iOS (Capacitor) is the ONLY environment where installed-app detection
// is possible (canOpenURL via the native Upi plugin). iOS Safari/PWA cannot
// enumerate installed apps reliably and must fall back to "try these apps" +
// QR. Android and desktop must keep their current behaviour.
import { Capacitor } from "@capacitor/core";
import { isIOS } from "@/lib/upiIntent";

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

export const isNativeIos = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  } catch {
    return false;
  }
};

export const isNativeAndroid = (): boolean => {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
};

/** iOS browser / PWA (Safari or an in-app browser) — NOT the native shell. */
export const isIosBrowser = (): boolean => !isNativePlatform() && isIOS();

/** Installed-app enumeration is only reliable in the native iOS shell. */
export const supportsInstalledAppDetection = (): boolean => isNativeIos();
