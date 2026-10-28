import { beforeEach, describe, expect, it, vi } from "vitest";
import { Capacitor } from "@capacitor/core";
import { isIosBrowser, isNativeAndroid, isNativeIos, supportsInstalledAppDetection } from "@/lib/ios";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

const mockPlatform = (native: boolean, platform: string) => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(native);
  vi.mocked(Capacitor.getPlatform).mockReturnValue(platform);
};

describe("platform detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("native iOS supports installed-app detection", () => {
    mockPlatform(true, "ios");
    expect(isNativeIos()).toBe(true);
    expect(supportsInstalledAppDetection()).toBe(true);
    expect(isIosBrowser()).toBe(false);
  });

  it("iOS browser/PWA does NOT support installed-app detection", () => {
    mockPlatform(false, "web");
    expect(isNativeIos()).toBe(false);
    expect(supportsInstalledAppDetection()).toBe(false);
  });

  it("Android (native or web) never probes installed apps", () => {
    mockPlatform(true, "android");
    expect(isNativeAndroid()).toBe(true);
    expect(supportsInstalledAppDetection()).toBe(false);

    mockPlatform(false, "web");
    expect(supportsInstalledAppDetection()).toBe(false);
  });

  it("degrades safely when Capacitor throws", () => {
    vi.mocked(Capacitor.isNativePlatform).mockImplementation(() => {
      throw new Error("not available");
    });
    expect(isNativeIos()).toBe(false);
    expect(supportsInstalledAppDetection()).toBe(false);
  });
});
