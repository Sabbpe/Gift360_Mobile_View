// src/lib/checkoutGate.ts
// Runs before every payment start (initiate-payment, retry-payment, UPI intent).
// Asks the server what it needs (email verified? location?), opens the
// CheckoutGateDialog only when something is needed, and returns the location
// to send with the payment call. If the requirements call fails, it returns
// nothing and the payment carries on as today (the server decides).
import {
  getCheckoutRequirements,
  type CheckoutLocation,
  type CheckoutRequirements,
} from "@/api/checkoutApi";

export const CHECKOUT_GATE_EVENT = "gift360:checkout-gate";

export class CheckoutCancelledError extends Error {
  constructor(message = "Payment was not started.") {
    super(message);
    this.name = "CheckoutCancelledError";
  }
}

export interface CheckoutGateRequest {
  requirements: CheckoutRequirements;
  needEmail: boolean;
  needLocation: boolean;
  resolve: (location: CheckoutLocation | undefined) => void;
  reject: (err: Error) => void;
}

/** A location confirmed this recently is reused instead of asking again. */
const REUSE_MS = 4 * 60 * 1000;
let lastLocation: CheckoutLocation | undefined;
let dialogMounted = false;

export const setCheckoutGateMounted = (mounted: boolean) => {
  dialogMounted = mounted;
};

export const rememberLocation = (loc: CheckoutLocation | undefined) => {
  lastLocation = loc;
};

/** For tests. */
export const resetCheckoutGate = () => {
  lastLocation = undefined;
  dialogMounted = false;
};

const freshLastLocation = (maxAgeSeconds: number): CheckoutLocation | undefined => {
  if (!lastLocation) return undefined;
  const limit = Math.min(REUSE_MS, maxAgeSeconds * 1000 - 30_000);
  return Date.now() - lastLocation.capturedAt < limit ? lastLocation : undefined;
};

export const needsEmailStep = (r: CheckoutRequirements): boolean =>
  !!r.email && !r.email.verified && (r.email.prompt || r.email.required);

export const needsLocationStep = (r: CheckoutRequirements): boolean => !!r.location?.ask;

export const runCheckoutGate = async (params: {
  orderNumber?: string;
  paymentMethod?: string;
}): Promise<CheckoutLocation | undefined> => {
  let requirements: CheckoutRequirements;
  try {
    requirements = await getCheckoutRequirements(params.orderNumber, params.paymentMethod);
  } catch {
    return undefined; // fail-open: older backend or network trouble
  }

  const needEmail = needsEmailStep(requirements);
  const reuse = requirements.location ? freshLastLocation(requirements.location.maxAgeSeconds) : undefined;
  const needLocation = needsLocationStep(requirements) && !reuse;

  if (!needEmail && !needLocation) return reuse;
  if (!dialogMounted) return reuse;

  return new Promise<CheckoutLocation | undefined>((resolve, reject) => {
    const detail: CheckoutGateRequest = {
      requirements,
      needEmail,
      needLocation,
      resolve: (loc) => {
        if (loc) rememberLocation(loc);
        resolve(loc ?? reuse);
      },
      reject,
    };
    window.dispatchEvent(new CustomEvent<CheckoutGateRequest>(CHECKOUT_GATE_EVENT, { detail }));
  });
};
