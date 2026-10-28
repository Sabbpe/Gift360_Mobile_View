// lib/paymentGateway.ts
// The checkout shows TWO buttons; the customer's tap decides the gateway.
//   EASEBUZZ    hosted checkout + method selector (UPI / NB / DC / CC)
//   JUSPAY_UPI  UPI intent (deeplink + polling)
// No build-time property decides this any more.
export type PaymentChoice = "EASEBUZZ" | "JUSPAY_UPI";
