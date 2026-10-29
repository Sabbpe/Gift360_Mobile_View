// lib/paymentModes.ts
// UPI is settled by the Juspay UPI-intent flow. The Easebuzz hosted checkout
// must never offer UPI, so its initiation payload carries every OTHER mode
// (NB / Debit / Credit). Android, iOS and desktop all use the same rule.
export const UPI_METHOD_CODE = "UPI";

export const isUpiPaymentMethod = (code?: string | null): boolean =>
  (code ?? "").trim().toUpperCase() === UPI_METHOD_CODE;

/** Modes for the Easebuzz payload: everything except UPI, order preserved, de-duped. */
export const easebuzzPaymentModes = (
  methods: ReadonlyArray<{ code: string }>
): string[] => {
  const seen = new Set<string>();
  const modes: string[] = [];
  for (const method of methods) {
    const code = method?.code?.trim();
    if (!code || isUpiPaymentMethod(code) || seen.has(code)) continue;
    seen.add(code);
    modes.push(code);
  }
  return modes;
};
