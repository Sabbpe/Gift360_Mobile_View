// hooks/useInstalledUpiApps.ts
// Detects which supported UPI apps are installed — ONLY in the native iOS shell
// (canOpenURL is unavailable to WKWebView/Safari). Results are cached for the
// session so the sheet does not re-probe on every render/poll.
import { useCallback, useEffect, useRef, useState } from "react";
import { supportsInstalledAppDetection } from "@/lib/ios";
import {
  IOS_UPI_APPS,
  detectInstalledUpiApps,
  type IosUpiApp,
  type ProbeFn,
} from "@/lib/iosUpiApps";
import { Upi } from "@/plugins/upi";

const CACHE_KEY = "gift360.upi.installedApps";

export type InstalledAppsStatus = "unsupported" | "detecting" | "ready" | "error";

interface State {
  status: InstalledAppsStatus;
  apps: IosUpiApp[];
}

/** Default probe: calls the native plugin. Throws when the plugin is missing. */
const nativeProbe: ProbeFn = async (probe: string) => {
  const result = await Upi.isInstalled({ probe });
  return result?.installed === true;
};

const readCache = (): IosUpiApp[] | null => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const keys = JSON.parse(raw) as unknown;
    if (!Array.isArray(keys)) return null;
    return IOS_UPI_APPS.filter((app) => keys.includes(app.key));
  } catch {
    return null;
  }
};

const writeCache = (apps: IosUpiApp[]): void => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(apps.map((app) => app.key)));
  } catch {
    /* storage unavailable - detection still works for this mount */
  }
};

interface Options {
  /** Only probe when the caller is on native iOS (default: auto-detect). */
  enabled?: boolean;
  /** Injectable probe for tests. */
  probeFn?: ProbeFn;
}

export const useInstalledUpiApps = (options: Options = {}) => {
  const { enabled = true, probeFn = nativeProbe } = options;
  const supported = enabled && supportsInstalledAppDetection();
  // Keep the latest probe in a ref: callers may pass an inline function, and
  // re-creating detect on every render would re-trigger the detect effect.
  const probeRef = useRef(probeFn);
  probeRef.current = probeFn;

  const [state, setState] = useState<State>(() => {
    if (!supported) return { status: "unsupported", apps: [] };
    const cached = readCache();
    return cached ? { status: "ready", apps: cached } : { status: "detecting", apps: [] };
  });

  const detect = useCallback(async () => {
    if (!supported) {
      setState({ status: "unsupported", apps: [] });
      return;
    }
    setState({ status: "detecting", apps: [] });

    let responded = false;
    const countingProbe: ProbeFn = async (probe) => {
      const installed = await probeRef.current(probe);
      responded = true;
      return installed;
    };

    try {
      const apps = await detectInstalledUpiApps(countingProbe);
      if (!responded) {
        // Plugin unavailable / every probe failed: cannot claim anything.
        setState({ status: "error", apps: [] });
        return;
      }
      writeCache(apps);
      setState({ status: "ready", apps });
    } catch {
      // Detection errors must never break the payment UI.
      setState({ status: "error", apps: [] });
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) {
      setState({ status: "unsupported", apps: [] });
      return;
    }
    const cached = readCache();
    if (cached) {
      setState({ status: "ready", apps: cached });
      return;
    }
    void detect();
  }, [detect, supported]);

  return {
    /** True only in the native iOS shell (probing is meaningful). */
    supported,
    status: state.status,
    apps: state.apps,
    loading: state.status === "detecting",
    refresh: detect,
  };
};
