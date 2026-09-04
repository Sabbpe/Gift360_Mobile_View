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

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

/** Fetches the randomized quiz question set localized to the given language. */
export const fetchQuizQuestions = async (lang: string): Promise<QuizQuestion[]> => {
  const response = await brandApi.get<QuizQuestion[]>("/v1/quiz/questions", {
    params: { lang },
  });
  return response.data;
};

export interface QuizGradeAnswer {
  questionId: number;
  selectedIndex: number;
}

export interface QuizGradeAnswerResult {
  success: boolean;
  correct: boolean;
  correctIndex: number;
}

/** Grades a single answered question server-side — the answer key is never exposed. */
export const gradeAnswer = async (
  clientId: string,
  questionId: number,
  selectedIndex: number
): Promise<QuizGradeAnswerResult> => {
  const response = await brandApi.post<QuizGradeAnswerResult>("/v1/rewards/grade-answer", {
    clientId,
    questionId,
    selectedIndex,
  });
  return response.data;
};
