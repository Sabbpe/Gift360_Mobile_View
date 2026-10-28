import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useInstalledUpiApps } from "@/hooks/useInstalledUpiApps";

let nativeIosSupported = true;
vi.mock("@/lib/ios", () => ({
  supportsInstalledAppDetection: () => nativeIosSupported,
}));

const CACHE_KEY = "gift360.upi.installedApps";

describe("useInstalledUpiApps", () => {
  beforeEach(() => {
    nativeIosSupported = true;
    sessionStorage.clear();
  });

  it("exposes ONLY the apps reported as installed on native iOS", async () => {
    const probeFn = vi.fn(async (probe: string) => probe === "tez://" || probe === "credpay://");
    const { result } = renderHook(() => useInstalledUpiApps({ probeFn }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.apps.map((app) => app.key)).toEqual(["Gpay", "Cred"]);
  });

  it("returns an empty list when no app is installed (QR-only fallback)", async () => {
    const { result } = renderHook(() => useInstalledUpiApps({ probeFn: async () => false }));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.apps).toEqual([]);
  });

  it("does not crash when detection fails (plugin unavailable)", async () => {
    const { result } = renderHook(() =>
      useInstalledUpiApps({
        probeFn: async () => {
          throw new Error("Upi.isInstalled is not implemented on web");
        },
      })
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.apps).toEqual([]);
  });

  it("reports unsupported off native iOS and never probes", async () => {
    nativeIosSupported = false;
    const probeFn = vi.fn(async () => true);
    const { result } = renderHook(() => useInstalledUpiApps({ probeFn }));

    await waitFor(() => expect(result.current.status).toBe("unsupported"));
    expect(result.current.apps).toEqual([]);
    expect(probeFn).not.toHaveBeenCalled();
  });

  it("caches results for the session (no re-probe on a second mount)", async () => {
    const probeFn = vi.fn(async (probe: string) => probe === "bhim://");
    const first = renderHook(() => useInstalledUpiApps({ probeFn }));
    await waitFor(() => expect(first.result.current.status).toBe("ready"));
    expect(first.result.current.apps.map((app) => app.key)).toEqual(["BHIM"]);
    expect(sessionStorage.getItem(CACHE_KEY)).toBeTruthy();

    probeFn.mockClear();
    const second = renderHook(() => useInstalledUpiApps({ probeFn }));
    await waitFor(() => expect(second.result.current.status).toBe("ready"));
    expect(second.result.current.apps.map((app) => app.key)).toEqual(["BHIM"]);
    expect(probeFn).not.toHaveBeenCalled();
  });
});
