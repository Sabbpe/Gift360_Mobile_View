import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUpiIntentPayment } from "@/hooks/useUpiIntentPayment";

const DEEPLINK = "upi://pay?pa=tfpuat@fblpay&am=1.01&tr=ORD123&tid=TXN9&orgid=000000";

const createUpiIntent = vi.fn();
const fetchUpiIntentStatus = vi.fn();

vi.mock("@/api/upiIntentApi", () => ({
  createUpiIntent: (...args: unknown[]) => createUpiIntent(...args),
  fetchUpiIntentStatus: (...args: unknown[]) => fetchUpiIntentStatus(...args),
}));

const openUpiApp = vi.fn();
let pendingIntent: { orderNumber: string; merchantRequestId: string; deeplink: string; startedAt: number } | null = null;

vi.mock("@/lib/upiIntent", () => ({
  openUpiApp: (...args: unknown[]) => openUpiApp(...args),
  registerUpiReturnListener: () => () => {},
  savePendingIntent: vi.fn(),
  clearPendingIntent: vi.fn(),
  loadPendingIntent: () => pendingIntent,
  isFreshPendingIntent: (pending: { startedAt: number }) => Date.now() - pending.startedAt < 15 * 60_000,
}));

vi.mock("@/lib/ios", () => ({ isNativePlatform: () => false }));

describe("useUpiIntentPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingIntent = null;
    createUpiIntent.mockResolvedValue({
      status: "SUCCESS",
      orderNumber: "ORD123",
      merchantRequestId: "REF1",
      deeplink: DEEPLINK,
      amount: "1.01",
    });
    fetchUpiIntentStatus.mockResolvedValue({
      orderNumber: "ORD123",
      status: "PENDING",
      paid: false,
    });
  });

  it("native iOS (autoOpen=false) never launches an app automatically", async () => {
    const { result, unmount } = renderHook(() =>
      useUpiIntentPayment({ orderNumber: "ORD123", autoOpen: false })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("awaiting");
    expect(openUpiApp).not.toHaveBeenCalled();
    unmount();
  });

  it("web/Android behaviour is unchanged: the deeplink is opened automatically", async () => {
    const { result, unmount } = renderHook(() => useUpiIntentPayment({ orderNumber: "ORD123" }));

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.phase).toBe("awaiting");
    expect(openUpiApp).toHaveBeenCalledWith(DEEPLINK);
    unmount();
  });

  it("resuming a fresh pending intent does NOT create another payment intent", async () => {
    pendingIntent = {
      orderNumber: "ORD123",
      merchantRequestId: "REF1",
      deeplink: DEEPLINK,
      startedAt: Date.now(),
    };

    const { result, unmount } = renderHook(() =>
      useUpiIntentPayment({ orderNumber: "ORD123", autoOpen: false })
    );

    await act(async () => {
      await result.current.start();
    });

    await waitFor(() => expect(result.current.phase).toBe("awaiting"));
    expect(createUpiIntent).not.toHaveBeenCalled();
    unmount();
  });
});
