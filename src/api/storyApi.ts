import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

export interface InstagramStoryResponse {
  success: boolean;
  duplicate?: boolean;
  message: string;
}

/** Submits the customer's Instagram reel/story link for the 1 SuperCoin promo. */
export const submitInstagramStory = async (
  clientId: string,
  storyUrl: string
): Promise<InstagramStoryResponse> => {
  try {
    const response = await axios.post<InstagramStoryResponse>(
      `${API_BASE_URL}/v1/instagram-story`,
      { clientId, storyUrl }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Could not submit your story link. Please try again."
      );
    }
    throw new Error("An unexpected error occurred");
  }
};
