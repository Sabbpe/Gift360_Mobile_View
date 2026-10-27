// src/hooks/useBackendPaymentInitiation.ts
import { useMutation } from "@tanstack/react-query";
import {
  initiateBackendPayment,
  type BackendPaymentInitiationResponse,
} from "@/api/paymentApi";
import { AxiosError } from "axios";

export type BackendPaymentInitiationInput =
  | string
  | {
      orderNumber: string;
      freshSession?: boolean;
      paymentMethod?: string;
      /** All modes the selector offered — opens the checkout with every one. */
      paymentModes?: string[];
    };

export const useBackendPaymentInitiation = () => {
  return useMutation<BackendPaymentInitiationResponse, AxiosError, BackendPaymentInitiationInput>({
    mutationFn: (input) =>
      typeof input === "string"
        ? initiateBackendPayment(input)
        : initiateBackendPayment(
            input.orderNumber,
            input.freshSession,
            input.paymentMethod,
            input.paymentModes
          ),
  });
};
