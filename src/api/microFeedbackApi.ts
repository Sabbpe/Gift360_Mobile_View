import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_BRAND_API_URL;

export interface MicroFeedbackAnsweredResponse {
  success: boolean;
  keys: string[];
}

export interface MicroFeedbackQuestion {
  key: string;
  text: string;
  page: string;
}

export interface MicroFeedbackQuestionsResponse {
  success: boolean;
  questions: MicroFeedbackQuestion[];
}

/** Question definitions seeded in the feedback table (served to the widget). */
export const getMicroQuestions = async (): Promise<MicroFeedbackQuestionsResponse> => {
  const response = await axios.get<MicroFeedbackQuestionsResponse>(
    `${API_BASE_URL}/v1/micro-feedback/questions`
  );
  return response.data;
};

/** Question keys the client already answered (so we stop re-asking them). */
export const getAnsweredMicroFeedback = async (
  clientId: string
): Promise<MicroFeedbackAnsweredResponse> => {
  const response = await axios.get<MicroFeedbackAnsweredResponse>(
    `${API_BASE_URL}/v1/micro-feedback/answered`,
    { params: { clientId } }
  );
  return response.data;
};

/** Records a Yes/No micro-feedback answer (upsert on client+question). */
export const submitMicroFeedback = async (payload: {
  clientId: string;
  questionKey: string;
  page: string;
  answer: "yes" | "no";
  question?: string;
}): Promise<{ success: boolean }> => {
  const response = await axios.post<{ success: boolean }>(
    `${API_BASE_URL}/v1/micro-feedback`,
    payload
  );
  return response.data;
};
