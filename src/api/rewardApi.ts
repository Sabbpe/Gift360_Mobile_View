import { brandApi } from "@/lib/valuedesignApi";

export const QUIZ_SUPERCOIN_REWARD = Number(import.meta.env.VITE_QUIZ_SUPERCOIN_REWARD ?? 5);

export type RewardStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "PENDING"
  | "CLAIMED"
  | "REDEEMED"
  | "EXPIRED"
  | "LOST";

export interface QuizRewardStatus {
  hasReward: boolean;
  publicId: string | null;
  status: RewardStatus | null;
  earnedAt: string | null;
  expiresAt: string | null;
  claimedAt: string | null;
  coinReward: number | null;
  calloutOrderNumber: string | null;
  calloutAt: string | null;
  quizStartExpiresAt: string | null;
  quizStartedAt: string | null;
  quizCompletedAt: string | null;
  createdAt: string | null;
  redeemedAt: string | null;
  redeemedOrderNumber: string | null;
  reservedOrderNumber: string | null;
  appliedAt: string | null;
  /** Legacy response alias; this value is coins, not rupees. */
  cashbackAmountCredited: number | null;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

export interface QuizSessionStartResponse {
  reward: QuizRewardStatus;
  questions: QuizQuestion[];
}

export const registerPaymentCancellation = async (
  clientId: string,
  orderNumber: string
): Promise<QuizRewardStatus> => {
  const response = await brandApi.post<QuizRewardStatus>("/v1/rewards/payment-cancelled", {
    clientId,
    orderNumber,
  });
  return response.data;
};

export const startQuizSession = async (
  clientId: string,
  publicId: string,
  language: string
): Promise<QuizSessionStartResponse> => {
  const response = await brandApi.post<QuizSessionStartResponse>("/v1/rewards/start", {
    clientId,
    publicId,
    language,
  });
  return response.data;
};

export const gradeAnswer = async (
  clientId: string,
  publicId: string,
  questionId: number,
  selectedIndex: number
): Promise<{ correct: boolean; correctIndex: number }> => {
  const response = await brandApi.post("/v1/rewards/answer", {
    clientId,
    publicId,
    questionId,
    selectedIndex,
  });
  return response.data;
};

export const completeQuiz = async (
  clientId: string,
  publicId: string
): Promise<QuizRewardStatus> => {
  const response = await brandApi.post<QuizRewardStatus>("/v1/rewards/complete", {
    clientId,
    publicId,
  });
  return response.data;
};

export const getRewardStatus = async (
  clientId: string,
  publicId?: string
): Promise<QuizRewardStatus> => {
  const response = await brandApi.get<QuizRewardStatus>("/v1/rewards/status", {
    params: { clientId, ...(publicId ? { publicId } : {}) },
  });
  return response.data;
};

