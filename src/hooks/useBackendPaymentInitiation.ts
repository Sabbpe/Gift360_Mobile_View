// src/hooks/useBackendPaymentInitiation.ts
import { useMutation } from "@tanstack/react-query";
import {
  initiateBackendPayment,
  type BackendPaymentInitiationResponse,
} from "@/api/paymentApi";
import { AxiosError } from "axios";

export const useBackendPaymentInitiation = () => {
  return useMutation<BackendPaymentInitiationResponse, AxiosError, string>({
    mutationFn: (orderNumber: string) => initiateBackendPayment(orderNumber),
  });
};
