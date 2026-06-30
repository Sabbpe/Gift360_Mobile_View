// types/coupon.ts
export interface FetchCouponsRequest {
  clientId: string;
  orderNumber: string;
}

export interface FetchCouponsResponse {
  message: string;
}

export type ValidateCouponRequest = Record<string, unknown>;
export type ValidateCouponResponse = Record<string, unknown>;
export type ConfirmCouponRequest = Record<string, unknown>;
export type ConfirmCouponResponse = Record<string, unknown>;
export type ReleaseCouponRequest = Record<string, unknown>;
export type ReleaseCouponResponse = Record<string, unknown>;
