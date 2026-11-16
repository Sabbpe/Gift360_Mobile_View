import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Gift360 native shell (iOS).
 *
 * Bundle id / app name
 * --------------------
 * The web repo carried no bundle id metadata, so the id below is a PLACEHOLDER
 * and MUST be confirmed against the App Store Connect / provisioning profile
 * before building (see IOS_UPI_SETUP.md). Override at generation time:
 *
 *   CAPACITOR_APP_ID=com.yourcompany.gift360 npx cap add ios
 *
 * Existing web build/deploy (`npm run dev|build|start`, dist/ on PM2) is
 * unaffected by this file.
 */
const config: CapacitorConfig = {
  appId: process.env.CAPACITOR_APP_ID || "io.gift360.app", // PENDING CONFIRMATION
  appName: process.env.CAPACITOR_APP_NAME || "Gift360",
  webDir: "dist",
  ios: {
    // Keep the WebView out of the notch/home-indicator area.
    contentInset: "always",
  },
};

export default config;
