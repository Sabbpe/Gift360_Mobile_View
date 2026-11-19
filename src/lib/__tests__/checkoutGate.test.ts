import { describe, it, expect, vi, beforeEach } from "vitest";

const getCheckoutRequirements = vi.fn();
vi.mock("@/api/checkoutApi", () => ({
  getCheckoutRequirements: (...a: unknown[]) => getCheckoutRequirements(...a),
}));

import {
  CHECKOUT_GATE_EVENT,
  CheckoutCancelledError,
  resetCheckoutGate,
  runCheckoutGate,
  setCheckoutGateMounted,
  type CheckoutGateRequest,
} from "@/lib/checkoutGate";

const req = (over: Record<string, unknown> = {}) => ({
  email: { mode: "OFF", verified: false, required: false, prompt: false },
  location: { mode: "OFF", ask: false, required: false, maxAgeSeconds: 300, pinFallback: true, notice: "n" },
  ...over,
});

const onGate = (handler: (d: CheckoutGateRequest) => void) => {
  const l = (e: Event) => handler((e as CustomEvent<CheckoutGateRequest>).detail);
  window.addEventListener(CHECKOUT_GATE_EVENT, l);
  return () => window.removeEventListener(CHECKOUT_GATE_EVENT, l);
};

describe("runCheckoutGate", () => {
  beforeEach(() => {
    resetCheckoutGate();
    setCheckoutGateMounted(true);
    getCheckoutRequirements.mockReset();
  });

  it("does nothing when the server needs nothing", async () => {
    getCheckoutRequirements.mockResolvedValue(req());
    const spy = vi.fn();
    const off = onGate(spy);
    await expect(runCheckoutGate({ orderNumber: "ORD-1" })).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
    off();
  });

  it("shows nothing to a verified customer (server says skipped)", async () => {
    getCheckoutRequirements.mockResolvedValue(
      req({
        email: { mode: "HARD", verified: true, required: false, prompt: false },
        location: { mode: "ENFORCE", ask: false, skipped: true, required: false, maxAgeSeconds: 300, pinFallback: true, notice: "n" },
      }),
    );
    const spy = vi.fn();
    const off = onGate(spy);
    await expect(runCheckoutGate({ orderNumber: "ORD-1", paymentMethod: "UPI" })).resolves.toBeUndefined();
    expect(spy).not.toHaveBeenCalled();
    off();
  });

  it("still asks an unverified customer", async () => {
    getCheckoutRequirements.mockResolvedValue(
      req({ location: { mode: "ENFORCE", ask: true, skipped: false, required: true, maxAgeSeconds: 300, pinFallback: true, notice: "n" } }),
    );
    const off = onGate((d) => d.resolve({ source: "PIN", pincode: "560001", capturedAt: Date.now(), consent: true } as never));
    await expect(runCheckoutGate({ orderNumber: "ORD-1", paymentMethod: "UPI" })).resolves.toMatchObject({ pincode: "560001" });
    off();
  });

  it("fails open when the requirements call fails", async () => {
    getCheckoutRequirements.mockRejectedValue(new Error("network"));
    await expect(runCheckoutGate({ orderNumber: "ORD-1" })).resolves.toBeUndefined();
  });

  it("opens the dialog for an unverified email and resolves when done", async () => {
    getCheckoutRequirements.mockResolvedValue(req({ email: { mode: "HARD", verified: false, required: true, prompt: true } }));
    const off = onGate((d) => {
      expect(d.needEmail).toBe(true);
      expect(d.needLocation).toBe(false);
      d.resolve(undefined);
    });
    await expect(runCheckoutGate({ orderNumber: "ORD-1" })).resolves.toBeUndefined();
    off();
  });

  it("returns the confirmed location and reuses it for 4 minutes", async () => {
    const ask = req({ location: { mode: "ENFORCE", ask: true, required: true, maxAgeSeconds: 300, pinFallback: true, notice: "n" } });
    getCheckoutRequirements.mockResolvedValue(ask);
    const loc = { source: "PIN" as const, pincode: "560001", capturedAt: Date.now(), consent: true };
    const handler = vi.fn((d: CheckoutGateRequest) => d.resolve(loc));
    const off = onGate(handler);
    await expect(runCheckoutGate({ orderNumber: "ORD-1", paymentMethod: "CC" })).resolves.toEqual(loc);
    await expect(runCheckoutGate({ orderNumber: "ORD-1", paymentMethod: "CC" })).resolves.toEqual(loc);
    expect(handler).toHaveBeenCalledTimes(1);
    off();
  });

  it("asks again once the saved location is too old", async () => {
    const ask = req({ location: { mode: "COLLECT", ask: true, required: false, maxAgeSeconds: 300, pinFallback: true, notice: "n" } });
    getCheckoutRequirements.mockResolvedValue(ask);
    const old = { source: "PIN" as const, pincode: "560001", capturedAt: Date.now() - 5 * 60 * 1000, consent: true };
    const handler = vi.fn((d: CheckoutGateRequest) => d.resolve(undefined));
    const off = onGate(handler);
    // first call stores an old location via the dialog
    handler.mockImplementationOnce((d: CheckoutGateRequest) => d.resolve(old));
    await runCheckoutGate({ orderNumber: "ORD-1" });
    await runCheckoutGate({ orderNumber: "ORD-1" });
    expect(handler).toHaveBeenCalledTimes(2);
    off();
  });

  it("rejects when the customer cancels a required step", async () => {
    getCheckoutRequirements.mockResolvedValue(req({ email: { mode: "HARD", verified: false, required: true, prompt: true } }));
    const off = onGate((d) => d.reject(new CheckoutCancelledError()));
    await expect(runCheckoutGate({ orderNumber: "ORD-1" })).rejects.toBeInstanceOf(CheckoutCancelledError);
    off();
  });

  it("skips the dialog if it is not mounted (server still decides)", async () => {
    setCheckoutGateMounted(false);
    getCheckoutRequirements.mockResolvedValue(req({ email: { mode: "HARD", verified: false, required: true, prompt: true } }));
    await expect(runCheckoutGate({ orderNumber: "ORD-1" })).resolves.toBeUndefined();
  });
});
