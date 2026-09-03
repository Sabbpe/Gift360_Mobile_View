import { brandApi } from "@/lib/valuedesignApi";

export type RewardStatus = "PENDING" | "CLAIMED" | "EXPIRED" | "LOST";

export interface QuizRewardStatus {
  hasReward: boolean;
  publicId: string | null;
  status: RewardStatus | null;
  earnedAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  /** Set once claimed — the ₹ amount credited (flat ₹10). */
  cashbackAmountCredited: number | null;
}

export const recordQuizAttempt = async (
  clientId: string,
  won: boolean
): Promise<{ publicId: string; status: string; expiresAt: string }> => {
  const response = await brandApi.post("/v1/rewards/attempt", { clientId, won });
  return response.data;
};

export const getRewardStatus = async (clientId: string): Promise<QuizRewardStatus> => {
  const response = await brandApi.get("/v1/rewards/status", { params: { clientId } });
  return response.data;
};

export const claimReward = async (clientId: string, publicId: string): Promise<QuizRewardStatus> => {
  const response = await brandApi.post("/v1/rewards/claim", { clientId, publicId });
  return response.data.reward;
};
