import axios from "axios";
import { brandApi } from "@/lib/valuedesignApi";

export interface CreateTicketRequest {
  name: string;
  email?: string;
  mobile?: string;
  subject?: string;
  message: string;
}

export interface CreateTicketResponse {
  success: boolean;
  publicId: string;
  status: string;
}

export interface TicketMessage {
  senderType: "USER" | "ADMIN";
  message: string;
  createdAt: string;
}

export type TicketStatus = "OPEN" | "REPLIED" | "CLOSED";

export interface TicketThread {
  status: TicketStatus;
  messages: TicketMessage[];
}

/** Thrown when posting to a ticket the backend has already closed. */
export class TicketClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketClosedError";
  }
}

/**
 * Create a new support ticket. Works for both guest and authenticated users —
 * brandApi's request interceptor attaches the Authorization bearer token
 * automatically when a logged-in user is present, and simply omits it otherwise.
 */
export const createSupportTicket = async (
  payload: CreateTicketRequest
): Promise<CreateTicketResponse> => {
  try {
    const response = await brandApi.post<CreateTicketResponse>(
      "/v1/support/tickets",
      payload
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to create support ticket"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};

export const sendSupportTicketMessage = async (
  publicId: string,
  message: string
): Promise<TicketMessage> => {
  try {
    const response = await brandApi.post<{ data: TicketMessage; success: boolean }>(
      `/v1/support/tickets/${publicId}/messages`,
      { message }
    );
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      if (data?.errorCode === "TICKET_CLOSED") {
        throw new TicketClosedError(data.message || "This conversation is closed.");
      }
      throw new Error(data?.message || "Failed to send your message");
    }
    throw new Error("An unexpected error occurred");
  }
};

export const getSupportTicketThread = async (
  publicId: string
): Promise<TicketThread> => {
  try {
    const response = await brandApi.get<{ data: TicketMessage[]; status: TicketStatus; success: boolean }>(
      `/v1/support/tickets/${publicId}/messages`
    );
    return { status: response.data.status, messages: response.data.data };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch support messages"
      );
    }
    throw new Error("An unexpected error occurred");
  }
};
