// src/api/checkoutApi.ts
// Email verification (task 4) and checkout requirements (task 5).
// The server enforces the same rules on payment start; these calls only let
// the app ask the customer up front.
// ordersApiClient: base is .../api, so paths below start at /v1.
import { ordersApiClient as apiClient } from "@/lib/valuedesignApi";

export type EmailMode = "OFF" | "LOG" | "SOFT" | "HARD";
export type LocationMode = "OFF" | "COLLECT" | "ENFORCE";

export interface EmailStatus {
  mode: EmailMode;
  verified: boolean;
  /** true = payment start will be refused until verified */
  required: boolean;
  /** true = ask the customer (they may skip unless required) */
  prompt: boolean;
  maskedEmail?: string | null;
  invalidReason?: string | null;
  suggestion?: string | null;
}

export interface LocationRequirement {
  mode: LocationMode;
  ask: boolean;
  /** true when the customer is verified on email and location, so the server skips the step */
  skipped?: boolean;
  required: boolean;
  maxAgeSeconds: number;
  pinFallback: boolean;
  notice: string;
}

export interface CheckoutRequirements {
  email: EmailStatus;
  location?: LocationRequirement;
}

export interface EmailCheckResponse {
  valid: boolean;
  reason: string;
  suggestion?: string | null;
  /** true = stop on an invalid address; false = only show the hint */
  block: boolean;
}

export type SendStatus =
  | "SENT" | "ALREADY_VERIFIED" | "NO_EMAIL" | "INVALID_EMAIL" | "IN_USE"
  | "RATE_LIMITED" | "LOCKED" | "SEND_FAILED" | "DISABLED";

export type ConfirmStatus =
  | "VERIFIED" | "ALREADY_VERIFIED" | "WRONG_CODE" | "EXPIRED" | "NO_CODE"
  | "LOCKED" | "NO_EMAIL" | "DISABLED";

export interface SendResult {
  status: SendStatus;
  maskedEmail?: string | null;
  retryAfterSeconds?: number | null;
  reason?: string | null;
}

export interface ConfirmResult {
  status: ConfirmStatus;
  attemptsLeft?: number | null;
  retryAfterSeconds?: number | null;
}

/** Location sent with initiate-payment / retry-payment / intent/create. */
export interface CheckoutLocation {
  source: "GPS" | "PIN";
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  capturedAt: number;
  pincode?: string;
  city?: string;
  state?: string;
  consent: boolean;
}

/** The send/confirm endpoints answer 4xx with a JSON body we still want. */
const bodyOf = <T,>(err: any): T | null => (err?.response?.data as T) ?? null;

export const getCheckoutRequirements = async (
  orderNumber?: string,
  paymentMethod?: string
): Promise<CheckoutRequirements> => {
  const { data } = await apiClient.get<CheckoutRequirements>("/v1/checkout/requirements", {
    params: { orderNumber, paymentMethod },
  });
  return data;
};

export const checkEmail = async (email: string): Promise<EmailCheckResponse> => {
  const { data } = await apiClient.post<EmailCheckResponse>("/v1/email/check", { email });
  return data;
};

export const sendEmailCode = async (): Promise<SendResult> => {
  try {
    const { data } = await apiClient.post<SendResult>("/v1/email/verification/send", {});
    return data;
  } catch (err) {
    const body = bodyOf<SendResult>(err);
    if (body?.status) return body;
    throw err;
  }
};

export const confirmEmailCode = async (code: string): Promise<ConfirmResult> => {
  try {
    const { data } = await apiClient.post<ConfirmResult>("/v1/email/verification/confirm", { code });
    return data;
  } catch (err) {
    const body = bodyOf<ConfirmResult>(err);
    if (body?.status) return body;
    throw err;
  }
};
