import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

// ---------------------------------------------------------------------------
// Reseller APIs — live endpoints (verified against UAT):
//   POST /v1/reseller/auth/token        clientId + clientSecret -> bearer token
//   GET  /v1/reseller/wallet/balance    { success, walletBalance }
//   GET  /v1/reseller/orders            { value: [...], Count }
// ---------------------------------------------------------------------------

export interface ResellerTokenResponse {
  success: boolean;
  resellerId: string;
  token: string;
  tokenType: string;
  expiresInSec: number;
  walletBalance: number;
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

/** POST /v1/reseller/auth/token */
export const requestResellerToken = async (
  clientId: string,
  clientSecret: string
): Promise<ResellerTokenResponse> => {
  const { data } = await axios.post<ResellerTokenResponse>(
    `${API_BASE_URL}/v1/reseller/auth/token`,
    { clientId, clientSecret }
  );
  return data;
};

const authHeaders = (): Record<string, string> => {
  const session = getResellerSession();
  return { Authorization: `Bearer ${session?.token ?? ""}` };
};

/** GET /v1/reseller/wallet/balance */
export const fetchResellerWallet =
  async (): Promise<{ success: boolean; walletBalance: number }> => {
    const { data } = await axios.get<{ success: boolean; walletBalance: number }>(
      `${API_BASE_URL}/v1/reseller/wallet/balance`,
      { headers: authHeaders() }
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

/** GET /v1/reseller/wallet/transactions — full money-movement audit log. */
export const fetchResellerWalletTransactions =
  async (): Promise<{
    success: boolean;
    walletBalance: number;
    transactions: ResellerWalletTransaction[];
  }> => {
    const { data } = await axios.get<{
      success: boolean;
      walletBalance: number;
      transactions: ResellerWalletTransaction[];
    }>(`${API_BASE_URL}/v1/reseller/wallet/transactions`, {
      headers: authHeaders(),
    });
    return data;
  };

/** GET /v1/reseller/orders — plain JSON array of order summary rows. */
export const fetchResellerOrders = async (): Promise<ResellerOrderRow[]> => {
  const { data } = await axios.get<ResellerOrderRow[] | { value?: ResellerOrderRow[] }>(
    `${API_BASE_URL}/v1/reseller/orders`,
    { headers: authHeaders() }
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

/** GET /v1/reseller/products?search=&page=&size= */
export const fetchResellerProducts = async (opts: {
  search?: string;
  page?: number;
  size?: number;
} = {}): Promise<ResellerProductListResponse> => {
  const params = new URLSearchParams();
  if (opts.search) params.set("search", opts.search);
  params.set("page", String(opts.page ?? 0));
  params.set("size", String(opts.size ?? 20));
  const { data } = await axios.get<ResellerProductListResponse>(
    `${API_BASE_URL}/v1/reseller/products?${params.toString()}`,
    { headers: authHeaders() }
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
 * COMPLETED). `Idempotency-Key` is REQUIRED by the service: same key from
 * the same reseller replays the original order (never a double debit).
 * Cross-origin browsers need UAT Apache to allow-list the header (ops line:
 * `Header always append Access-Control-Allow-Headers "Idempotency-Key"`);
 * local dev bypasses CORS entirely via the Vite /api proxy.
 */
export const createResellerOrder = async (
  payload: ResellerOrderPayload,
  idempotencyKey: string
): Promise<ResellerOrderResult> => {
  const { data } = await axios.post<ResellerOrderResult>(
    `${API_BASE_URL}/v1/reseller/orders`,
    payload,
    { headers: { ...authHeaders(), "Idempotency-Key": idempotencyKey } }
  );
  return data;
};

/** GET /v1/reseller/orders/{orderNumber} — full detail incl. credentials. */
export const fetchResellerOrderDetails = async (
  orderNumber: string
): Promise<ResellerOrderResult> => {
  const { data } = await axios.get<ResellerOrderResult>(
    `${API_BASE_URL}/v1/reseller/orders/${encodeURIComponent(orderNumber)}`,
    { headers: authHeaders() }
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
  const { data } = await axios.get<{
    success?: boolean;
    profile?: ResellerProfile;
  }>(`${API_BASE_URL}/v1/reseller/profile`, { headers: authHeaders() });
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
  token: string;
  resellerId: string;
  clientId: string;
  walletBalance?: number;
  savedAt: number;
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
