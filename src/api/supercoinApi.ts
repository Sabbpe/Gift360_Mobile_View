import { brandApi, ordersApiClient } from "@/lib/valuedesignApi";

export type SuperCoinIdentityType = "MOBILE" | "FK_USER" | "HASHED_MOBILE";

export interface SuperCoinIdentity {
  identifier: string;
  type: SuperCoinIdentityType;
}

export interface SuperCoinSearchResponse {
  userExists?: boolean;
  state?: string;
  message?: string;
  [key: string]: unknown;
}

export interface SuperCoinBalanceResponse {
  balance?: number;
  totalBalance?: number;
  availableBalance?: number;
  [key: string]: unknown;
}

export interface SuperCoinTransactionResponse {
  transactionId?: string;
  transactionState?: string;
  message?: string;
  statusCode?: string;
  success?: boolean;
  otp?: string;
  [key: string]: unknown;
}

export interface SuperCoinInitHoldResponse extends SuperCoinTransactionResponse {
  transactionId: string;
  transactionState: string;
  otp?: string;
}

export interface SuperCoinAuthorizeHoldResponse extends SuperCoinTransactionResponse {
  transactionId: string;
  transactionState: string;
}

export interface SuperCoinUserPayload {
  identity: SuperCoinIdentity;
}

export const normalizeMobileToE164 = (mobile?: string | null): string | null => {
  const trimmed = mobile?.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digitsOnly.length >= 10) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  return trimmed.startsWith("+") ? trimmed : `+${digitsOnly || trimmed}`;
};

export interface SuperCoinTransactionalPayload extends SuperCoinUserPayload {
  merchantWalletId: string;
  merchantTransactionId: string;
  merchantReferenceId?: string;
  amount?: number;
  displayName?: string;
  coinStatus?: string;
  referenceTransactionId?: string;
  stampCoinCreditBy?: number;
  stampExpiry?: number;
  otp?: string;
}

export interface SuperCoinTransactionsPayload extends SuperCoinUserPayload {
  startDate?: number;
  endDate?: number;
  limit?: number;
  transactionType?: string;
  coinType?: string;
  store?: number;
}

export interface SuperCoinStatusPayload extends SuperCoinUserPayload {
  merchantWalletId: string;
  coinStatus: string;
}

const postSuperCoin = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await brandApi.post<T>(`/v1/supercoin${path}`, body);
  return response.data;
};

export const searchSuperCoinUser = (identity: SuperCoinIdentity) =>
  postSuperCoin<SuperCoinSearchResponse>("/searchUser", { identity });

export const enrolSuperCoinUser = (identity: SuperCoinIdentity) =>
  postSuperCoin<SuperCoinSearchResponse>("/enrolUser", { identity });

// client_id of the logged-in user — authUser is written by AuthContext on
// login (same source walletApi/valuedesignApi read).
const readAuthClientId = (): string | null => {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return typeof user?.clientId === "string" && user.clientId ? user.clientId : null;
  } catch {
    return null;
  }
};

/**
 * POST /api/v1/clients/supercoin-balance — store the balance just fetched
 * from /balance into client_profile.supercoin_balance (V55). Fire-and-forget;
 * failures never affect the balance flow itself.
 */
export const storeSuperCoinBalance = (clientId: string, balance: number | string): Promise<void> =>
  brandApi
    .post("/v1/clients/supercoin-balance", { clientId, balance })
    .then(() => undefined);

export const fetchSuperCoinBalance = async (
  identity: SuperCoinIdentity
): Promise<SuperCoinBalanceResponse> => {
  try {
    const response = await postSuperCoin<SuperCoinBalanceResponse>("/balance", { identity });
    // After every /balance fetch while logged in, persist the snapshot so
    // client_profile always carries the latest SuperCoin balance.
    const clientId = readAuthClientId();
    if (clientId) {
      storeSuperCoinBalance(clientId, extractSuperCoinBalance(response)).catch(() => {});
    }
    return response;
  } catch (err) {
    // Upstream 404 = not a Flipkart SuperCoin user -> record "NA" once on the
    // profile (server keeps an existing balance, ignores NA when not empty).
    const status = (err as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      const clientId = readAuthClientId();
      if (clientId) {
        storeSuperCoinBalance(clientId, "NA").catch(() => {});
      }
    }
    throw err;
  }
};

export const initSuperCoinHold = (payload: SuperCoinTransactionalPayload) =>
  postSuperCoin<SuperCoinInitHoldResponse>("/initHold", payload);

export const authorizeSuperCoinHold = (payload: Pick<SuperCoinTransactionalPayload, "identity" | "merchantWalletId" | "merchantTransactionId" | "otp">) =>
  postSuperCoin<SuperCoinAuthorizeHoldResponse>("/authorizeHold", payload);

export const createSuperCoinHold = (payload: Pick<SuperCoinTransactionalPayload, "identity" | "amount" | "merchantWalletId" | "merchantTransactionId" | "merchantReferenceId" | "displayName" | "stampExpiry">) =>
  postSuperCoin<SuperCoinTransactionResponse>("/hold", payload);

export const redeemSuperCoinHold = (payload: Pick<SuperCoinTransactionalPayload, "identity" | "merchantTransactionId" | "referenceTransactionId" | "merchantWalletId" | "merchantReferenceId" | "displayName">) =>
  postSuperCoin<SuperCoinTransactionResponse>("/redeemHold", payload);

export const cancelSuperCoinHold = (payload: Pick<SuperCoinTransactionalPayload, "identity" | "merchantTransactionId" | "merchantWalletId">) =>
  postSuperCoin<SuperCoinTransactionResponse>("/unhold", payload);

export const refundSuperCoin = (payload: Pick<SuperCoinTransactionalPayload, "identity" | "merchantTransactionId" | "referenceTransactionId" | "amount" | "merchantWalletId" | "merchantReferenceId" | "displayName">) =>
  postSuperCoin<SuperCoinTransactionResponse>("/refund", payload);

export const fetchSuperCoinTransactions = (payload: SuperCoinTransactionsPayload) =>
  postSuperCoin<SuperCoinTransactionResponse>("/transactions", payload);

export const fetchSuperCoinExpiring = (payload: Pick<SuperCoinTransactionsPayload, "identity" | "startDate" | "endDate">) =>
  postSuperCoin<SuperCoinTransactionResponse>("/expiring", payload);

export const fetchSuperCoinTransactionStatus = (
  transactionId: string,
  payload: SuperCoinStatusPayload
) => postSuperCoin<SuperCoinTransactionResponse>(`/transaction/${transactionId}/status`, payload);

export interface SuperCoinBurnOrderResponse {
  success?: boolean;
  orderId?: string;
  orderNumber?: string;
  status?: string;
  coinsRedeemed?: number;
  coinsEarned?: number;
  balance?: number;
  message?: string;
  error?: string;
  errorCode?: string;
  [key: string]: unknown;
}

export interface SuperCoinBurnOrderPayload {
  orderNumber: string;
  displayName: string;
  amount: number;
  clientId: string;
}

export const burnSuperCoinOrder = (payload: SuperCoinBurnOrderPayload) =>
  postSuperCoin<SuperCoinBurnOrderResponse>("/burn-and-order", payload);

// Burn ratio = coins required per rupee of voucher value. It comes ONLY from the
// database (giftvouchers_brands.supercoin_burn_ratio), served by
// POST /v1/supercoin/config. There is deliberately no env/hardcoded fallback: a
// stale fallback shows customers a coin amount the server then rejects
// (HOLD_AMOUNT_MISMATCH). Until the config has loaded the ratio is unknown, so
// calculateSuperCoinsRequired() returns 0 and the apply buttons stay disabled.
let superCoinBurnRatio: number | null = null;

export const getSuperCoinBurnRatio = (): number | null => superCoinBurnRatio;

// Only accept a positive finite ratio; a bad/absent server value keeps the
// previous one.
export const setSuperCoinBurnRatio = (ratio: unknown): void => {
  const parsed = Number(ratio);
  if (Number.isFinite(parsed) && parsed > 0) {
    superCoinBurnRatio = parsed;
  }
};

export const calculateSuperCoinsRequired = (voucherAmount: number): number => {
  if (superCoinBurnRatio === null) return 0;
  return Math.ceil(Math.round(voucherAmount * superCoinBurnRatio * 100) / 100);
};

export const canAffordVoucher = (balance: number, voucherAmount: number): boolean => {
  return balance >= calculateSuperCoinsRequired(voucherAmount);
};

export const extractSuperCoinBalance = (
  response?: SuperCoinBalanceResponse | null
): number => {
  if (!response) return 0;

  const candidates = [
    response.balance,
    response.totalBalance,
    response.availableBalance,
    (response as { amount?: unknown }).amount,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

export interface SuperCoinConfigResponse {
  sku?: string;
  capPercent?: number;
  burnRatio?: number;
  surchargePercent?: number;
  earnPercentSpecialSku?: number;
  [key: string]: unknown;
}

// Live-configurable SuperCoin rules (POST /v1/supercoin/config). Sent as POST
// to match the rest of this API surface; it behaves as a READ -- no auth, no
// persistence. The SKU to read rides in the request body and the response comes
// straight from that catalog row (giftvouchers_brands, V41 migration), so a SQL
// UPDATE is reflected without a frontend redeploy.
//
// `sku` is OPTIONAL. Omit it (or send blank) and the backend resolves to its
// sabbpe.supercoin.voucher-sku property, so callers that don't have a brand code
// to hand still get the right values. Whatever resolves, the response echoes it
// back in `sku` so the caller can see which row was actually read.
//
// Side effect: the returned burnRatio is applied to the module-level ratio that
// calculateSuperCoinsRequired() reads, so any page that fetches the config
// (Cart, OrderCheckout, the convert-coins modal) also refreshes the conversion
// display everywhere else in the session.
export const fetchSuperCoinConfig = async (sku?: string): Promise<SuperCoinConfigResponse> => {
  // No SKU is sent: the backend resolves the SuperCoin voucher row itself, so
  // nothing about which SKU or ratio to use lives in the frontend build.
  const response = await brandApi.post<SuperCoinConfigResponse>(
    "/v1/supercoin/config",
    sku?.trim() ? { sku: sku.trim() } : {}
  );
  if (typeof response.data?.burnRatio === "number") {
    setSuperCoinBurnRatio(response.data.burnRatio);
  }
  return response.data;
};

// Per-brand SuperCoin share (giftvouchers_brands.supercoin_share_percent, V51), keyed by brand_id.
// It is the most of the voucher price that may be paid in SuperCoins in SuperCoin mode:
//   0 = no SuperCoin mode for this brand (cash only), 1..99 = up to that percent, 100 = SuperCoins only.
// A brand with no entry has no DB rule (the global cap and the built-in exclusion list apply).
// Any failure returns an empty map, so every brand keeps its previous behaviour.
export const fetchSuperCoinBrandShares = async (): Promise<Record<string, number>> => {
  try {
    const response = await ordersApiClient.get<{ shares?: Record<string, number | string> }>("/v1/supercoin/brand-shares");
    const out: Record<string, number> = {};
    Object.entries(response.data?.shares ?? {}).forEach(([brandId, value]) => {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) out[brandId] = Math.min(n, 100);
    });
    return out;
  } catch {
    return {};
  }
};

export type SuperCoinPayMode = "SC_ONLY" | "CASH_EARN";

export interface SuperCoinModalBrand {
  brandId: string;
  brandCode: string;
  brandName: string;
  payMode: SuperCoinPayMode;
  earnPercent?: number | string | null;
}

// Brands shown in the SuperCoin modal and how each is paid for. Driven by
// giftvouchers_brands.supercoin_modal_enabled / supercoin_modal_order /
// supercoin_pay_mode (V47), so a SQL UPDATE changes the list with no deploy.
export const fetchSuperCoinModalBrands = async (): Promise<SuperCoinModalBrand[]> => {
  const response = await ordersApiClient.get<{ brands?: SuperCoinModalBrand[] }>("/v1/supercoin/modal-brands");
  return Array.isArray(response.data?.brands) ? response.data.brands : [];
};
