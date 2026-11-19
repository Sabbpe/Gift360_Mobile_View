import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// jsdom lacks these; input-otp uses them.
(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
(document as any).elementFromPoint ??= () => null;

const sendEmailCode = vi.fn();
const confirmEmailCode = vi.fn();
vi.mock("@/api/checkoutApi", () => ({
  sendEmailCode: () => sendEmailCode(),
  confirmEmailCode: (c: string) => confirmEmailCode(c),
  getCheckoutRequirements: vi.fn(),
}));
const getDevicePosition = vi.fn();
vi.mock("@/utils/geolocation", () => ({
  getDevicePosition: () => getDevicePosition(),
  reverseGeocode: vi.fn().mockResolvedValue({ city: "Bengaluru", state: "Karnataka", country: "India", displayName: "", postcode: "560001" }),
}));

import CheckoutGateDialog, { confirmStatusMessage, invalidEmailMessage } from "@/components/CheckoutGateDialog";
import { CHECKOUT_GATE_EVENT, type CheckoutGateRequest } from "@/lib/checkoutGate";

const open = (over: Partial<CheckoutGateRequest> & { requirements: CheckoutGateRequest["requirements"] }) => {
  const resolve = vi.fn();
  const reject = vi.fn();
  act(() => {
    window.dispatchEvent(new CustomEvent(CHECKOUT_GATE_EVENT, {
      detail: { needEmail: false, needLocation: false, resolve, reject, ...over },
    }));
  });
  return { resolve, reject };
};

const location = { mode: "ENFORCE" as const, ask: true, required: true, maxAgeSeconds: 300, pinFallback: true, notice: "We ask for your location." };

describe("CheckoutGateDialog", () => {
  beforeEach(() => {
    sendEmailCode.mockReset();
    confirmEmailCode.mockReset();
    getDevicePosition.mockReset();
  });

  it("messages", () => {
    expect(invalidEmailMessage("DISPOSABLE")).toMatch(/Temporary/);
    expect(confirmStatusMessage("WRONG_CODE", 1)).toMatch(/1 try left/);
  });

  it("verifies email with a code, then finishes", async () => {
    render(<CheckoutGateDialog />);
    sendEmailCode.mockResolvedValue({ status: "SENT", maskedEmail: "ra***@gmail.com" });
    confirmEmailCode.mockResolvedValue({ status: "VERIFIED" });
    const { resolve } = open({
      needEmail: true,
      requirements: { email: { mode: "HARD", verified: false, required: true, prompt: true, maskedEmail: "ra***@gmail.com" } },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Send code" }));
    await screen.findByText(/Enter the code sent/);
    const input = document.querySelector("input[data-input-otp]") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(undefined));
    expect(confirmEmailCode).toHaveBeenCalledWith("123456");
    expect(screen.queryByRole("button", { name: "Skip for now" })).toBeNull();
  });

  it("typed PIN fallback needs consent and a valid PIN", async () => {
    render(<CheckoutGateDialog />);
    const { resolve } = open({ needLocation: true, requirements: { email: { mode: "OFF", verified: false, required: false, prompt: false }, location } });
    fireEvent.click(await screen.findByRole("button", { name: "Enter PIN code instead" }));
    fireEvent.change(screen.getByLabelText("PIN code"), { target: { value: "560001" } });
    const go = screen.getByRole("button", { name: "Continue with this PIN code" });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(go);
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ source: "PIN", pincode: "560001", consent: true }));
  });

  it("GPS path shows city and PIN to confirm", async () => {
    render(<CheckoutGateDialog />);
    getDevicePosition.mockResolvedValue({ ok: true, position: { lat: 12.97, lng: 77.59, accuracy: 20, timestamp: Date.now() } });
    const { resolve } = open({ needLocation: true, requirements: { email: { mode: "OFF", verified: false, required: false, prompt: false }, location } });
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await screen.findByText(/Bengaluru, Karnataka · PIN 560001/);
    fireEvent.click(screen.getByRole("button", { name: "Yes, continue to pay" }));
    expect(resolve).toHaveBeenCalledWith(expect.objectContaining({ source: "GPS", latitude: 12.97, pincode: "560001" }));
  });

  it("denied permission switches to PIN entry", async () => {
    render(<CheckoutGateDialog />);
    getDevicePosition.mockResolvedValue({ ok: false, error: "DENIED" });
    open({ needLocation: true, requirements: { email: { mode: "OFF", verified: false, required: false, prompt: false }, location } });
    fireEvent.click(await screen.findByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await screen.findByText(/permission is off/);
    expect(screen.getByLabelText("PIN code")).toBeInTheDocument();
  });

  it("optional location can be skipped", async () => {
    render(<CheckoutGateDialog />);
    const { resolve } = open({ needLocation: true, requirements: { email: { mode: "OFF", verified: false, required: false, prompt: false }, location: { ...location, mode: "COLLECT", required: false } } });
    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));
    expect(resolve).toHaveBeenCalledWith(undefined);
  });
});
