// src/api/earnEstimateApi.ts
import { brandApi } from "@/lib/valuedesignApi";

export interface EarnEstimate {
  coins: number;
  percent: number;
}

export interface EarnEstimateItem {
  brandId: string;
  lineTotal: number;
}

/**
 * SuperCoins the cart would earn, computed by the backend with the same rule it uses
 * to credit them (per-brand earn percent, else the global rate).
 */
export const fetchEarnEstimate = async (
  items: EarnEstimateItem[],
  cashPayable: number
): Promise<EarnEstimate> => {
  const res = await brandApi.post<EarnEstimate>("/v1/supercoin/earn-estimate", { items, cashPayable });
  return {
    coins: Number(res.data?.coins ?? 0),
    percent: Number(res.data?.percent ?? 0),
  };
};
