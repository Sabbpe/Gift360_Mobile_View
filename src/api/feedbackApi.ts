import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

export interface FeedbackRequest {
  speed?: number;
  usability?: string;
  payment?: string;
  overall?: number;
  nps?: number;
  locationShare?: string;
  userLocation?: string;
  gender?: string;
  occupation?: string;
  brandBought?: string;
  hasSuggestion?: string;
  suggestion?: string;
  clientId?: string;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
}

export const submitFeedback = async (
  data: FeedbackRequest
): Promise<FeedbackResponse> => {
  try {
    const response = await axios.post<FeedbackResponse>(
      `${API_BASE_URL}/v1/feedback`,
      data
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to submit feedback"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};
