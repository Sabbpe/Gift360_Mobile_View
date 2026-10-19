// src/api/adminQuizApi.ts
// Quiz performance endpoints (/api/admin/dashboard/quiz/*). Reuses the admin
// axios client so the X-Admin-Key header and 403 handling stay identical.

import { adminApiClient, type DateRange } from "./adminApi";

export const fetchQuizSummary = async (range: DateRange = {}) => {
  const res = await adminApiClient.get("/quiz/summary", { params: range });
  return res.data;
};

export type QuizRewardFilter =
  | "leakage"
  | "all"
  | "won"
  | "credited"
  | "lost"
  | "abandoned";

export const fetchQuizRewards = async (
  params: DateRange & { filter?: QuizRewardFilter; page?: number; size?: number } = {}
) => {
  const res = await adminApiClient.get("/quiz/rewards", { params });
  return res.data;
};
