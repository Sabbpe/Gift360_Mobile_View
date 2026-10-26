import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

// ---------------------------------------------------------------------------
// V52 reseller auth model:
//   POST /v1/reseller/auth/login           contact_email + password -> JWT
//   POST /v1/reseller/auth/jwt             (Bearer) -> { clientId, clientSecretHash }
//   every BUSINESS POST                    has clientId + clientSecretHash in
//                                           its JSON body, fetched via /auth/jwt
//                                           immediately before the call —
//                                           NEVER persisted client-side
//   POST /v1/reseller/auth/logout          clears the single-session JWT
//   POST /v1/reseller/auth/token           legacy machine handshake (kept)
// ---------------------------------------------------------------------------

export interface ResellerLoginResponse {
  success: boolean;
  message?: string;
  token: string;
  tokenType?: string;
  expiresInSec?: number;
  resellerId: string;
}

export interface ResellerJwtCredentials {
  success?: boolean;
  resellerId: string;
  clientId: string;
  clientSecretHash: string;
}

export interface ResellerOrderRow {
  orderNumber: string;
  clientOrderRef: string | null;
  totalAmount: number;
  discountAmount: number | null;
  currency: string;
  status: string;
  createdAt: string;
}

/** POST /v1/reseller/auth/login — stores the JWT session on success. */
export const resellerLogin = async (
  email: string,
  password: string
): Promise<ResellerLoginResponse> => {
  const { data } = await axios.post<ResellerLoginResponse>(
    `${API_BASE_URL}/v1/reseller/auth/login`,
    { email, password }
  );
  if (data?.success && data.token && data.resellerId) {
    saveResellerSession({
      token: data.token,
      resellerId: data.resellerId,
      savedAt: Date.now(),
    });
  }
  return data;
};

/** POST /v1/reseller/auth/forgot-password — always resolves success server-side. */
export const resellerForgotPassword = async (
  email: string
): Promise<{ success: boolean; message?: string }> => {
  const { data } = await axios.post<{ success: boolean; message?: string }>(
    `${API_BASE_URL}/v1/reseller/auth/forgot-password`,
    { email }
  );
  return data;
};

/** POST /v1/reseller/auth/reset-password — one-time link token + new password. */
export const resellerResetPassword = async (
  token: string,
  password: string
): Promise<{ success: boolean; message?: string }> => {
  const { data } = await axios.post<{ success: boolean; message?: string }>(
    `${API_BASE_URL}/v1/reseller/auth/reset-password`,
    { token, password }
  );
  return data;
};

/** POST /v1/reseller/auth/logout — best-effort; clears the server session. */
export const resellerLogout = async (): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/v1/reseller/auth/logout`,
      {},
      { headers: { Authorization: `Bearer ${getResellerSession()?.token ?? ""}` } }
    );
  } catch {
    /* best-effort — local session is cleared regardless */
  }
};

/** POST /v1/reseller/auth/jwt — fresh api credentials (Bearer session JWT). */
export const fetchResellerJwt = async (): Promise<ResellerJwtCredentials> => {
  const { data } = await axios.post<ResellerJwtCredentials>(
    `${API_BASE_URL}/v1/reseller/auth/jwt`,
    {},
    {
      headers: {
        Authorization: `Bearer ${getResellerSession()?.token ?? ""}`,
      },
    }
  );
  return data;
};

/** Fetch fresh credentials and attach them to a JSON request body. */
const withResellerCredentials = async <T extends Record<string, unknown>>(
  payload: T = {} as T
): Promise<T & { clientId: string; clientSecretHash: string }> => {
  const creds = await fetchResellerJwt();
  return {
    ...payload,
    clientId: creds.clientId,
    clientSecretHash: creds.clientSecretHash,
  };
};

/** GET /v1/reseller/wallet/balance */
export const fetchResellerWallet =
  async (): Promise<{ success: boolean; walletBalance: number }> => {
    const { data } = await axios.post<{ success: boolean; walletBalance: number }>(
      `${API_BASE_URL}/v1/reseller/wallet/balance`,
      await withResellerCredentials({})
    );
    return data;
  };

/** One wallet-ledger row — the reseller's transaction / audit entry. */
export interface ResellerWalletTransaction {
  id: number;
  resellerId: string;
  type: "DEBIT" | "CREDIT" | "REFUND" | "DISCOUNT" | string;
  amount: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
}

/** POST /v1/reseller/wallet/transactions — full money-movement audit log. */
export const fetchResellerWalletTransactions =
  async (): Promise<{
    success: boolean;
    walletBalance: number;
    transactions: ResellerWalletTransaction[];
  }> => {
    const { data } = await axios.post<{
      success: boolean;
      walletBalance: number;
      transactions: ResellerWalletTransaction[];
    }>(`${API_BASE_URL}/v1/reseller/wallet/transactions`, await withResellerCredentials({}));
    return data;
  };

/** POST /v1/reseller/orders/list — plain JSON array of order summary rows. */
export const fetchResellerOrders = async (): Promise<ResellerOrderRow[]> => {
  const { data } = await axios.post<ResellerOrderRow[] | { value?: ResellerOrderRow[] }>(
    `${API_BASE_URL}/v1/reseller/orders/list`,
    await withResellerCredentials({})
  );
  // BE returns a bare array; tolerate a wrapped shape just in case.
  if (Array.isArray(data)) return data;
  return (data as { value?: ResellerOrderRow[] }).value ?? [];
};

// ---------------------------------------------------------------------------
// Catalog — GET /v1/reseller/products (paginated) & product detail
// ---------------------------------------------------------------------------

export interface ResellerProduct {
  brandSku: string;
  brandName: string;
  brandType: string; // "Variable" | "Fixed"
  category: string;
  currency: string;
  minPrice: number | null;
  maxPrice: number | null;
  denominations: number[];
  stockAvailable: string;
  images: string[];
  /** Percent off unit price for resellers (null/0 = none). */
  discount: number | null;
}

export interface ResellerProductListResponse {
  success: boolean;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  products: ResellerProduct[];
}

/** POST /v1/reseller/products/search — filter/page values + auth in JSON. */
export const fetchResellerProducts = async (opts: {
  search?: string;
  page?: number;
  size?: number;
} = {}): Promise<ResellerProductListResponse> => {
  const { data } = await axios.post<ResellerProductListResponse>(
    `${API_BASE_URL}/v1/reseller/products/search`,
    await withResellerCredentials({
      search: opts.search,
      page: opts.page ?? 0,
      size: opts.size ?? 20,
    })
  );
  return data;
};

// ---------------------------------------------------------------------------
// Orders — POST /v1/reseller/orders (wallet debited atomically)
// ---------------------------------------------------------------------------

export interface ResellerOrderPayload {
  order: {
    clientOrderRef?: string;
    currency: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
      mobile: string;
    };
  };
  items: Array<{
    brandSku: string;
    brandName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface ResellerCredential {
  cardNumber?: string;
  cardPin?: string;
  activationCode?: string;
  activationUrl?: string;
  expiry?: string;
}

export interface ResellerOrderItemResult {
  itemId: number;
  brandSku: string;
  brandName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  netAmount: number;
  fulfillmentStatus: string; // COMPLETE | PROCESSING | FAILED
  credentials: ResellerCredential[];
}

export interface ResellerOrderResult {
  orderNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number | null;
  currency: string;
  clientOrderRef: string | null;
  items: ResellerOrderItemResult[];
}

/**
 * POST /v1/reseller/orders — 201 with full detail (+ credentials when
 * COMPLETED). `idempotencyKey` in the JSON body is REQUIRED by the service: same key from
 * the same reseller replays the original order (never a double debit).
 * Auth credentials and idempotency are all JSON body fields, avoiding the
 * custom headers blocked by the UAT Apache CORS allow-list.
 */
export const createResellerOrder = async (
  payload: ResellerOrderPayload,
  idempotencyKey: string
): Promise<ResellerOrderResult> => {
  const { data } = await axios.post<ResellerOrderResult>(
    `${API_BASE_URL}/v1/reseller/orders`,
    await withResellerCredentials({ ...payload, idempotencyKey })
  );
  return data;
};

/** POST /v1/reseller/orders/details — full detail incl. credentials. */
export const fetchResellerOrderDetails = async (
  orderNumber: string
): Promise<ResellerOrderResult> => {
  const { data } = await axios.post<ResellerOrderResult>(
    `${API_BASE_URL}/v1/reseller/orders/details`,
    await withResellerCredentials({ orderNumber })
  );
  return data;
};

/** One flattened voucher (credential) row for the Vouchers tab. */
export interface ResellerVoucherRow {
  orderNumber: string;
  clientOrderRef: string | null;
  /** Order date (summary createdAt, ISO local). */
  orderDate: string;
  brandSku: string;
  brandName: string;
  cardNumber?: string;
  cardPin?: string;
  activationCode?: string;
  activationUrl?: string;
  expiry?: string;
}

/**
 * Profile shown from the dashboard header avatar — GET /v1/reseller/profile
 * (Bearer). Contract expected from the backend team:
 *   { "success": true, "profile": {
 *       "resellerId", "clientId", "organizationName", "contactEmail",
 *       "contactMobile", "city", "state", "pan", "gst", "status",
 *       "walletBalance", "createdAt" } }
 * A flat object response is tolerated too. Until it ships the FE falls back
 * to session-known fields (clientId / resellerId / wallet).
 */
export interface ResellerProfile {
  resellerId?: string;
  clientId?: string;
  organizationName?: string;
  contactEmail?: string;
  contactMobile?: string;
  city?: string;
  state?: string;
  pan?: string;
  gst?: string;
  status?: string;
  walletBalance?: number;
  createdAt?: string;
}

export const fetchResellerProfile = async (): Promise<ResellerProfile> => {
  const { data } = await axios.post<{
    success?: boolean;
    profile?: ResellerProfile;
  }>(`${API_BASE_URL}/v1/reseller/profile`, await withResellerCredentials({}));
  return data.profile ?? (data as unknown as ResellerProfile);
};

// ---------------------------------------------------------------------------
// Idempotency-key lifecycle: unique per NEW order, the SAME value when
// retrying that order. Keyed to a signature of the checkout (items + buyer);
// any change makes it a new order with a fresh key. Cleared on success.
// ---------------------------------------------------------------------------

const IDEM_KEY = "resellerOrderIdem";

const newIdempotencyKey = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const getOrderIdempotencyKey = (signature: string): string => {
  try {
    const raw = localStorage.getItem(IDEM_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { sig?: string; key?: string };
      if (v?.sig === signature && v?.key) return v.key;
    }
  } catch {
    /* fall through to a fresh key */
  }
  const key = newIdempotencyKey();
  try {
    localStorage.setItem(IDEM_KEY, JSON.stringify({ sig: signature, key }));
  } catch {
    /* ignore */
  }
  return key;
};

export const clearOrderIdempotencyKey = (): void => {
  try {
    localStorage.removeItem(IDEM_KEY);
  } catch {
    /* ignore */
  }
};

// ---------------------------------------------------------------------------
// Reseller cart (localStorage — server has no cart; orders are created
// directly from these lines).
// ---------------------------------------------------------------------------

const CART_KEY = "resellerCart";
const BUYER_KEY = "resellerBuyer";

export interface ResellerCartItem {
  brandSku: string;
  brandName: string;
  image?: string;
  unitPrice: number;
  quantity: number;
  /** Reseller discount percent for this SKU (0 = none). */
  discount: number;
}

export const getResellerCart = (): ResellerCartItem[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ResellerCartItem[];
  } catch {
    return [];
  }
};

export const saveResellerCart = (items: ResellerCartItem[]): void => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
};

export const clearResellerCart = (): void => {
  try {
    localStorage.removeItem(CART_KEY);
  } catch {
    /* ignore */
  }
};

export interface ResellerBuyer {
  fullName: string;
  email: string;
  mobile: string;
}

// ---------------------------------------------------------------------------
// Voucher CSV export (client-side). The backend has no export endpoint, but
// the dashboard already holds every credential row from GET /orders +
// GET /orders/{orderNumber} — so the file is assembled in the browser from
// API-fetched data (RFC-4180 quoting, UTF-8 BOM for Excel).
// ---------------------------------------------------------------------------

const csvEscape = (v?: string | null): string => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const vouchersToCsv = (rows: ResellerVoucherRow[]): string => {
  const header = [
    "Order Number",
    "Client Reference",
    "Order Date",
    "Brand SKU",
    "Brand Name",
    "Card Number",
    "Card PIN",
    "Activation Code",
    "Activation URL",
    "Expiry",
  ];
  const lines = rows.map((r) =>
    [
      r.orderNumber,
      r.clientOrderRef,
      r.orderDate,
      r.brandSku,
      r.brandName,
      r.cardNumber,
      r.cardPin,
      r.activationCode,
      r.activationUrl,
      r.expiry,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [header.join(","), ...lines].join("\r\n");
};

export const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const getResellerBuyer = (): ResellerBuyer | null => {
  try {
    const raw = localStorage.getItem(BUYER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResellerBuyer;
  } catch {
    return null;
  }
};

export const saveResellerBuyer = (buyer: ResellerBuyer): void => {
  try {
    localStorage.setItem(BUYER_KEY, JSON.stringify(buyer));
  } catch {
    /* ignore */
  }
};

// ---------------------------------------------------------------------------
// Reseller session (localStorage) — separate from the consumer auth session.
// ---------------------------------------------------------------------------

const SESSION_KEY = "resellerSession";

export interface ResellerSession {
  /** JWT from POST /auth/login (single session — server invalidates others). */
  token: string;
  resellerId: string;
  savedAt: number;
  /** Legacy clientId/secret login leftovers — no longer written by login. */
  clientId?: string;
  walletBalance?: number;
}

export const saveResellerSession = (session: ResellerSession): void => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — session stays in memory for this page load only */
  }
};

export const getResellerSession = (): ResellerSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ResellerSession;
  } catch {
    return null;
  }
};

export const clearResellerSession = (): void => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
};
