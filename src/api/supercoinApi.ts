import { brandApi } from "@/lib/valuedesignApi";

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

export const fetchSuperCoinBalance = (identity: SuperCoinIdentity) =>
  postSuperCoin<SuperCoinBalanceResponse>("/balance", { identity });

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

export const SUPERCOIN_BURN_RATIO = Number(import.meta.env.VITE_SUPERCOIN_BURN_RATIO) || 1.25;

export const calculateSuperCoinsRequired = (voucherAmount: number): number => {
  return Math.ceil(Math.round(voucherAmount * SUPERCOIN_BURN_RATIO * 100) / 100);
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
  capPercent?: number;
  [key: string]: unknown;
}

// Live-configurable SuperCoin cap percent (sabbpe.supercoin.cap-percent on
// the backend). Fetched fresh, not cached client-side, so a property change
// on the server is reflected without a frontend redeploy.
export const fetchSuperCoinConfig = async (): Promise<SuperCoinConfigResponse> => {
  const response = await brandApi.get<SuperCoinConfigResponse>("/v1/supercoin/config");
  return response.data;
};