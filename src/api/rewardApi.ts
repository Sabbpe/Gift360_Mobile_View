import { brandApi } from "@/lib/valuedesignApi";

/**
 * Flat cashback amount credited on a winning quiz attempt. Configurable via
 * VITE_QUIZ_CASHBACK_REWARD in .env (defaults to ₹10).
 */
export const QUIZ_CASHBACK_REWARD: number = Number(
  import.meta.env.VITE_QUIZ_CASHBACK_REWARD ?? 10
);

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

export interface QuizEligibilityResponse {
  success: boolean;
  eligible: boolean;
  clientId: string;
  message?: string;
  errorCode?: string;
}

/** Checks if the user is allowed to take the quiz today (one attempt per day). */
export const checkQuizEligibility = async (clientId: string): Promise<QuizEligibilityResponse> => {
  const response = await brandApi.get<QuizEligibilityResponse>("/v1/rewards/eligible", {
    params: { clientId },
  });
  return response.data;
};
