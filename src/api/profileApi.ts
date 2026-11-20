// DB-derived verification state for the signed-in customer's profile.
import { ordersApiClient as apiClient } from "@/lib/valuedesignApi";

export interface ProfileVerification {
  emailVerified: boolean;
  locationVerified: boolean;
  verified: boolean;
}

export const getProfileVerification = async (): Promise<ProfileVerification> => {
  const { data } = await apiClient.get<ProfileVerification>("/v1/profile/verification");
  return data;
};
