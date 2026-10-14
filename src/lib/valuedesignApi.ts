import axios from "axios";
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { isHiddenCatalogBrand } from "@/lib/hidden-catalog-brands";

// In dev with no env set, use Vite proxy: requests to /api/* go to backend (e.g. localhost:8081).
const BRAND_API_URL =
  import.meta.env.VITE_BRAND_API_URL ??
  (import.meta.env.DEV ? "/api" : undefined);
const GIFTCARD_API_URL = import.meta.env.VITE_GIFTCARD_API_URL;

// Common request interceptor function
const addAuthToken = (config: InternalAxiosRequestConfig) => {
  const authUser = localStorage.getItem("authUser");
  if (authUser) {
    const user = JSON.parse(authUser);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
};

// Common response interceptor function
const handleAuthError = (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Don't fire auth:expired if we're on payment-result page
    // This allows the payment result to be shown even if session is expired
    const currentPath = window.location.pathname || "";
    const isPaymentResultPage = /^\/payment-result\/?$/i.test(currentPath);
    if (!isPaymentResultPage) {
      localStorage.removeItem("authUser");
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
  }
  return Promise.reject(error);
};

// Strips SuperCoin-only vouchers from every brand LIST response (arrays only),
// so they never reach Home, search, category or recommendation screens.
// Detail lookups return a single object, so the Try Now modal is unaffected.
const stripHiddenBrands = (response: AxiosResponse) => {
  const strip = (list: any) =>
    Array.isArray(list)
      ? list.filter(
          (b) =>
            !b ||
            typeof b !== "object" ||
            !isHiddenCatalogBrand(
              b.brandId || b.BrandId || b.brand_id || b.id,
              b.brandName || b.BrandName || b.brand_name,
              b.brandCode || b.BrandCode || b.brand_code
            )
        )
      : list;
  const d: any = response.data;
  if (Array.isArray(d)) {
    response.data = strip(d);
  } else if (d && typeof d === "object") {
    for (const key of ["data", "brands", "result"]) {
      if (Array.isArray(d[key])) d[key] = strip(d[key]);
    }
    if (d.payload && Array.isArray(d.payload.result)) d.payload.result = strip(d.payload.result);
    if (d.data && Array.isArray(d.data.result)) d.data.result = strip(d.data.result);
  }
  return response;
};

// BRAND API INSTANCE
export const brandApi = axios.create({
  baseURL: BRAND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

brandApi.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
brandApi.interceptors.response.use(stripHiddenBrands, handleAuthError);

// GIFTCARD API INSTANCE
export const giftcardApiClient = axios.create({
  baseURL: GIFTCARD_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

giftcardApiClient.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
giftcardApiClient.interceptors.response.use((response) => response, handleAuthError);

export const ordersApiClient = axios.create({
  baseURL: BRAND_API_URL, // ✅ https://vdspbck.gift360.io/api
  headers: {
    "Content-Type": "application/json",
  },
});

ordersApiClient.interceptors.request.use(addAuthToken, (error) => Promise.reject(error));
ordersApiClient.interceptors.response.use((response) => response, handleAuthError);

export const cartApiClient = axios.create({
  baseURL: BRAND_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
