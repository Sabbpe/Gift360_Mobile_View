// lib/paymentGateway.ts
// Which gateway the checkout uses. Easebuzz stays fully supported server-side;
// this only decides which FE flow runs (hosted redirect vs UPI-intent deeplink).
export type PaymentGateway = "EASEBUZZ" | "JUSPAY_UPI";

const raw = (import.meta.env.VITE_PAYMENT_GATEWAY as string | undefined)?.trim().toUpperCase();

export const PAYMENT_GATEWAY: PaymentGateway = raw === "JUSPAY_UPI" ? "JUSPAY_UPI" : "EASEBUZZ";

export const isUpiIntentGateway = PAYMENT_GATEWAY === "JUSPAY_UPI";
