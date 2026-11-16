import { describe, expect, it } from "vitest";
import { easebuzzPaymentModes, isUpiPaymentMethod } from "@/lib/paymentModes";

const METHODS = [{ code: "UPI" }, { code: "DC" }, { code: "CC" }, { code: "NB" }];

describe("payment mode routing (UPI -> Juspay, others -> Easebuzz)", () => {
  it("removes UPI from the Easebuzz payload and keeps the order", () => {
    expect(easebuzzPaymentModes(METHODS)).toEqual(["DC", "CC", "NB"]);
  });

  it("never sends UPI even with different casing/whitespace", () => {
    expect(easebuzzPaymentModes([{ code: " upi " }, { code: "NB" }])).toEqual(["NB"]);
  });

  it("returns an empty list when only UPI is configured (caller omits the field)", () => {
    expect(easebuzzPaymentModes([{ code: "UPI" }])).toEqual([]);
  });

  it("de-dupes and ignores blank codes", () => {
    expect(easebuzzPaymentModes([{ code: "NB" }, { code: "NB" }, { code: " " }])).toEqual(["NB"]);
  });

  it("detects the UPI selection that must use the Juspay flow", () => {
    expect(isUpiPaymentMethod("UPI")).toBe(true);
    expect(isUpiPaymentMethod(" upi ")).toBe(true);
    expect(isUpiPaymentMethod("DC")).toBe(false);
    expect(isUpiPaymentMethod(undefined)).toBe(false);
  });
});
