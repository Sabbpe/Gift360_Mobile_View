// api/upiIntentApi.ts
// Juspay UPI-intent calls to the Gift360 backend. The backend talks to the
// ecosystem service (Juspay) and owns verification; the client never decides
// "paid" and never builds the deeplink itself.
import { giftcardApiClient } from "@/lib/valuedesignApi";
import { runCheckoutGate } from "@/lib/checkoutGate";
import { getDeviceId } from "@/lib/deviceId";

export interface UpiIntentCreateResponse {
  status: string;
  responseMessage?: string;
  orderNumber: string;
  merchantRequestId: string;
  orderId?: string;
  gatewayTransactionId?: string;
  amount?: string;
  deeplink: string;
  hostUrlsForIOS?: Record<string, string>;
  expiresAt?: string;
}

export interface UpiIntentStatusResponse {
  orderNumber: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";
  orderStatus?: string;
  paid: boolean;
  gatewayTransactionId?: string;
  amount?: string;
  transactionTimestamp?: string;
  message?: string;
}

export const createUpiIntent = async (orderNumber: string): Promise<UpiIntentCreateResponse> => {
  // Email code / location step when the server asks for it (tasks 4 and 5).
  const location = await runCheckoutGate({ orderNumber, paymentMethod: "UPI" });
  const response = await giftcardApiClient.post<UpiIntentCreateResponse>(
    `/orders/${orderNumber}/intent/create`,
    location ? { location } : {},
    { headers: { "X-Device-Id": getDeviceId() } }
  );
  return response.data;
};

export const fetchUpiIntentStatus = async (orderNumber: string): Promise<UpiIntentStatusResponse> => {
  const response = await giftcardApiClient.post<UpiIntentStatusResponse>(
    `/orders/${orderNumber}/intent/status`,
    {}
  );
  return response.data;
};
