import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpiIntentPayment } from "@/hooks/useUpiIntentPayment";

const createUpiIntent = vi.fn();
const fetchUpiIntentStatus = vi.fn();

vi.mock("@/api/upiIntentApi", () => ({
  createUpiIntent: (...args: unknown[]) => createUpiIntent(...args),
  fetchUpiIntentStatus: (...args: unknown[]) => fetchUpiIntentStatus(...args),
}));

vi.mock("@/lib/upiIntent", () => ({
  openUpiApp: vi.fn(),
  registerUpiReturnListener: vi.fn(() => () => {}),
  savePendingIntent: vi.fn(),
  clearPendingIntent: vi.fn(),
  loadPendingIntent: () => null,
  isFreshPendingIntent: () => false,
}));

vi.mock("@/lib/ios", () => ({ isNativePlatform: () => true }));

type AppStateHandler = (state: { isActive: boolean }) => void;
let appStateHandler: AppStateHandler | null = null;
const removeListener = vi.fn();

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(async (event: string, handler: AppStateHandler) => {
      if (event === "appStateChange") appStateHandler = handler;
      return { remove: removeListener };
    }),
  },
}));

describe("useUpiIntentPayment — native foreground resume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appStateHandler = null;
    fetchUpiIntentStatus.mockResolvedValue({
      orderNumber: "ORD123",
      status: "PENDING",
      paid: false,
    });
  });

  it("re-polls the backend when the native app becomes active again", async () => {
    const { unmount } = renderHook(() => useUpiIntentPayment({ orderNumber: "ORD123" }));

    await waitFor(() => expect(appStateHandler).not.toBeNull());

    await act(async () => {
      appStateHandler!({ isActive: true });
    });

    await waitFor(() => expect(fetchUpiIntentStatus).toHaveBeenCalledWith("ORD123"));
    unmount();
  });

  it("does NOT create a new payment intent on resume", async () => {
    const { unmount } = renderHook(() => useUpiIntentPayment({ orderNumber: "ORD123" }));

    await waitFor(() => expect(appStateHandler).not.toBeNull());

    await act(async () => {
      appStateHandler!({ isActive: true });
    });

    await waitFor(() => expect(fetchUpiIntentStatus).toHaveBeenCalledTimes(1));
    expect(createUpiIntent).not.toHaveBeenCalled();
    unmount();
  });

  it("ignores background events and detaches the listener on unmount", async () => {
    const { unmount } = renderHook(() => useUpiIntentPayment({ orderNumber: "ORD123" }));

    await waitFor(() => expect(appStateHandler).not.toBeNull());

    await act(async () => {
      appStateHandler!({ isActive: false });
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchUpiIntentStatus).not.toHaveBeenCalled();

    unmount();
    await waitFor(() => expect(removeListener).toHaveBeenCalled());
  });
});
