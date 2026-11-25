// DB-derived verification state for the signed-in customer's profile.
import { ordersApiClient as apiClient } from "@/lib/valuedesignApi";

export interface ProfileVerification {
  emailVerified: boolean;
  locationVerified: boolean;
  verified: boolean;
}

export interface ProfileDetailsUpdate {
  email?: string;
  name?: string;
  mobileNumber?: string;
  gender?: string;
  dateOfBirth?: string;
}

export interface ProfileDetailsResponse {
  success: boolean;
  clientId: string;
  name: string;
  email: string;
  mobileNumber: string;
  emailVerified: boolean;
  reverificationRequired: boolean;
}

export const getProfileVerification = async (): Promise<ProfileVerification> => {
  const { data } = await apiClient.get<ProfileVerification>("/v1/profile/verification");
  return data;
};

export const updateProfileDetails = async (details: ProfileDetailsUpdate): Promise<ProfileDetailsResponse> => {
  const { data } = await apiClient.post<ProfileDetailsResponse>("/v1/profile/details", details);
  return data;
};
