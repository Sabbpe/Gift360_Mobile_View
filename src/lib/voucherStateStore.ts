// lib/voucherStateStore.ts
//
// Local terminal-state floor for gifting/scratch vouchers.
//
// WHY: POST /coupons/scratch and /coupons/gift write to ONE of two server
// tables — the per-card row (giftcard_coupon_items, when an itemId was
// known) or the shared order-item flags (giftcard_order_items, legacy path
// when card-items hadn't loaded / failed). The Orders / OrderDetails reads
// then pick a source based on whether THEIR card-items fetch succeeded this
// time around. Whenever write and read land on DIFFERENT sources, the
// previously-revealed/gifted voucher rendered as PENDING again ("starts
// from scratch").
//
// This store records every confirmed terminal outcome (success or 409
// already-terminal) under BOTH keys — the exact card (itemId) and the order
// item (orderItemId) — and the readers below union it with whatever server
// flags they got, so a terminal state NEVER reverts to PENDING. It follows
// the same localStorage pattern as Orders' g360_redeemed_vouchers key.

export type VoucherTerminalState = "SCRATCHED" | "GIFTED";

const STORAGE_KEY = "g360_voucher_terminal_states";

interface TerminalStore {
  byItem?: Record<string, VoucherTerminalState>;
  byOrderItem?: Record<string, VoucherTerminalState>;
}

const readStore = (): TerminalStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TerminalStore) : {};
  } catch {
    return {};
  }
};

const writeStore = (store: TerminalStore): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable — server flags still apply */
  }
};

/** Record a confirmed reveal/gift under both the card and order-item keys. */
export const recordVoucherTerminalState = (
  orderItemId: string | undefined,
  itemId: string | undefined,
  state: VoucherTerminalState
): void => {
  if (!orderItemId && !itemId) return;
  const store = readStore();
  if (itemId) {
    store.byItem = store.byItem || {};
    store.byItem[itemId] = state;
  }
  if (orderItemId) {
    store.byOrderItem = store.byOrderItem || {};
    store.byOrderItem[orderItemId] = state;
  }
  writeStore(store);
};

/** Exact-card lookup — for reads that matched a per-card row. */
export const readCardTerminalState = (
  itemId?: string
): VoucherTerminalState | undefined =>
  itemId ? readStore().byItem?.[itemId] : undefined;

/** Order-item lookup — for reads that fell back to the shared flags. */
export const readOrderItemTerminalState = (
  orderItemId?: string
): VoucherTerminalState | undefined =>
  orderItemId ? readStore().byOrderItem?.[orderItemId] : undefined;
