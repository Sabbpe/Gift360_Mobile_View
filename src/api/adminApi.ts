// src/api/adminApi.ts
// Dedicated client for the /api/admin/dashboard/* endpoints.
// Uses a separate header (X-Admin-Key) rather than the customer JWT flow,
// since there's no admin/role concept in the existing auth system.

import axios from "axios";

const BRAND_API_URL =
  import.meta.env.VITE_BRAND_API_URL ??
  (import.meta.env.DEV ? "/api" : undefined);

export const ADMIN_KEY_STORAGE = "gift360_admin_key";

export const adminApiClient = axios.create({
  baseURL: `${BRAND_API_URL}/admin/dashboard`,
});

adminApiClient.interceptors.request.use((config) => {
  const key = sessionStorage.getItem(ADMIN_KEY_STORAGE);
  if (key) {
    config.headers["X-Admin-Key"] = key;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403) {
      sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    }
    return Promise.reject(err);
  }
);

export interface DateRange {
  from?: string; // YYYY-MM-DD
  to?: string;
}

export const fetchSummary = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/summary", { params: range });
  return res.data;
};

export const fetchOrders = async (
  range: DateRange & {
    brandCode?: string;
    voucherStatus?: "generated" | "failed";
    page?: number;
    size?: number;
  } = {}
) => {
  const res = await adminApiClient.get("/orders", { params: range });
  return res.data;
};

export const fetchBrandStats = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/brands", { params: range });
  return res.data;
};

export const fetchCustomerStats = async (
  range: DateRange & { page?: number; size?: number } = {}
) => {
  const res = await adminApiClient.get("/customers", { params: range });
  return res.data;
};

export const fetchSuperCoinTrend = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/supercoins", { params: range });
  return res.data;
};

export const fetchErrorBreakdown = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/errors", { params: range });
  return res.data;
};

export const fetchGeography = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/geography", { params: range });
  return res.data;
};

export const fetchAbandonedCarts = async (
  range: DateRange & { page?: number; size?: number } = {}
) => {
  const res = await adminApiClient.get("/abandoned", { params: range });
  return res.data;
};

export const fetchCartsSummary = async () => {
  const res = await adminApiClient.get("/carts/summary");
  return res.data;
};

export const fetchCartsByCustomer = async (
  params: { minStaleHours?: number; page?: number; size?: number } = {}
) => {
  const res = await adminApiClient.get("/carts/customers", { params });
  return res.data;
};

export const fetchCartsByBrand = async () => {
  const res = await adminApiClient.get("/carts/brands");
  return res.data;
};

/** Converts an array of flat objects to CSV and triggers a browser download. */
export const downloadCsv = (rows: any[], filename: string) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    return str.includes(",") || str.includes('"') || str.includes("\n")
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** Verifies a candidate key actually works before saving it. */
export const verifyAdminKey = async (key: string): Promise<boolean> => {
  try {
    await axios.get(`${BRAND_API_URL}/admin/dashboard/summary`, {
      headers: { "X-Admin-Key": key },
    });
    return true;
  } catch {
    return false;
  }
};
