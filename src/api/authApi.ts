import axios from "axios";
import type { LoginResponse, LoginWithOtpRequest, LogoutRequest, ForgotPasswordRequest, ForgotPasswordResponse, ValidateTokenRequest, ValidateTokenResponse, ResetPasswordRequest, ResetPasswordResponse, SignupRequest, LoginRequest } from "@/types/auth";

const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL;

export const signup = async (data: SignupRequest): Promise<string> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/signup`, data);
    return response.data; // Returns "Signup successful"
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      throw new Error(error.response.data);
    }
    throw error;
  }
};

export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await axios.post(`${API_BASE_URL}/login`, data);
  return response.data;
};

/** Decode JWT payload for userId (clientId), phoneNumber, email. */
export function decodeJwtPayload(token: string): {
  userId?: string;
  phoneNumber?: string;
  email?: string;
} {
  try {
    const base64 = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    if (!base64) return {};
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>;
    return {
      userId: payload.userId as string | undefined,
      phoneNumber: payload.phoneNumber as string | undefined,
      email: payload.email as string | undefined,
    };
  } catch {
    return {};
  }
}

interface ValidatedUserInfo {
  name: string;
  email: string;
  mobile: string;
  clientId: string;
}

/**
 * The verify-otp response carries no user profile data, only a token — so the
 * registered name has to be fetched separately via validate-token (the same
 * endpoint the backend's JwtAuthenticationFilter uses to resolve userName).
 * Falls back to null on any failure so login itself never breaks on this.
 */
async function fetchValidatedUserInfo(token: string): Promise<ValidatedUserInfo | null> {
  try {
    const res = await axios.post<{ valid: boolean; userInfo: ValidatedUserInfo | null }>(
      `${API_BASE_URL}/validate-token`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data.valid ? res.data.userInfo : null;
  } catch {
    return null;
  }
}

/** Verify OTP and login (backend: POST /auth/login/verify-otp). Returns token; userInfo enriched via validate-token. */
export const loginWithOtp = async (data: LoginWithOtpRequest): Promise<LoginResponse> => {
  const response = await axios.post<{ success: boolean; token: string | null; message: string }>(
    `${API_BASE_URL}/login/verify-otp`,
    { mobileNumber: data.mobileNumber, otp: data.otp }
  );
  const body = response.data;
  const payload = body.token ? decodeJwtPayload(body.token) : {};
  const validated = body.token && payload.userId ? await fetchValidatedUserInfo(body.token) : null;
  return {
    token: body.token ?? null,
    message: body.message,
    userInfo:
      body.token && payload.userId
        ? {
          name: validated?.name || "",
          email: validated?.email || payload.email || "",
          mobile: validated?.mobile || payload.phoneNumber || data.mobileNumber,
          clientId: validated?.clientId || payload.userId,
        }
        : null,
  };
};

export const logout = async (data: LogoutRequest): Promise<string> => {
  // The deployed auth service does not currently expose POST /auth/logout.
  // Logout remains a client-side state reset so the UI can sign out cleanly.
  return "Logout successful";
};

export const forgotPassword = async (data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> => {
  const response = await axios.post(`${API_BASE_URL}/forgot-password`, data);
  return response.data;
};

export const validateResetToken = async (data: ValidateTokenRequest): Promise<ValidateTokenResponse> => {
  const response = await axios.post(`${API_BASE_URL}/forgot-password/validate`, data);
  return response.data;
};

// ✅ Add reset password API
export const resetPassword = async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
  const response = await axios.post(`${API_BASE_URL}/forgot-password/reset`, data);
  return response.data;
};