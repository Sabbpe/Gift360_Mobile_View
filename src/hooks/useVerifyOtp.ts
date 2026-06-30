import { useMutation } from "@tanstack/react-query";
import * as otpApi from "@/api/otpApi";

interface VerifyOtpParams {
  reqId: string;
  otp: string;
}

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: ({ reqId, otp }: VerifyOtpParams) =>
      ((otpApi as any).verifyOtp ?? (otpApi as any).registerVerifyOtp)(reqId, otp),
  });
};
