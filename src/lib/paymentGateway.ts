// lib/paymentGateway.ts
// The checkout shows ONE Pay button + a payment-method selector. The selected
// method decides the gateway - no build-time property:
//   UPI        Juspay UPI intent (deeplink / app sheet + polling)
//   NB/DC/CC   Easebuzz hosted checkout (UPI is never offered there)
export type PaymentChoice = "EASEBUZZ" | "JUSPAY_UPI";