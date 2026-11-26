import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchModalBrands = vi.fn();
vi.mock("@/api/supercoinApi", () => ({
  fetchSuperCoinModalBrands: (...args: unknown[]) => fetchModalBrands(...args),
}));

import {
  CONVERT_COINS_PATH,
  ensureScOnlyBrandsLoaded,
  isScOnlyBrand,
  isScOnlyBrandSync,
} from "@/lib/scOnlyBrands";

const brand = (brandId: string, payMode: string) => ({
  brandId,
  brandCode: brandId.toUpperCase(),
  brandName: brandId,
  payMode,
  earnPercent: 5,
});

describe("SC_ONLY purchase routing", () => {
  beforeEach(() => {
    fetchModalBrands.mockReset();
    sessionStorage.clear();
  });

  it("classifies only SC_ONLY brands as convert-coins brands", async () => {
    fetchModalBrands.mockResolvedValue([
      brand("sc1", "SC_ONLY"),
      brand("cash1", "CASH_EARN"),
    ]);

    expect(await isScOnlyBrand("sc1")).toBe(true);
    expect(await isScOnlyBrand("cash1")).toBe(false);
    expect(await isScOnlyBrand(undefined)).toBe(false);
    expect(await isScOnlyBrand(null)).toBe(false);
  });

  it("caches the backend configuration between calls", async () => {
    fetchModalBrands.mockResolvedValue([brand("sc1", "SC_ONLY")]);

    await ensureScOnlyBrandsLoaded(true);
    await ensureScOnlyBrandsLoaded();

    expect(fetchModalBrands).toHaveBeenCalledTimes(1);
    expect(isScOnlyBrandSync("sc1")).toBe(true);
    expect(isScOnlyBrandSync("missing")).toBe(false);
  });

  it("fails open when the configuration cannot be loaded", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/scOnlyBrands");
    fetchModalBrands.mockRejectedValue(new Error("network"));

    const ids = await fresh.ensureScOnlyBrandsLoaded(true);

    expect(ids.size).toBe(0);
    expect(await fresh.isScOnlyBrand("sc1")).toBe(false);
  });

  it("reuses the existing convert-coins page", () => {
    expect(CONVERT_COINS_PATH).toBe("/supercoin-voucher");
  });
});
