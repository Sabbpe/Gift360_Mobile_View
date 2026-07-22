import { useMutation } from "@tanstack/react-query";
import {
  enrolSuperCoinUser,
  fetchSuperCoinBalance,
  initSuperCoinHold,
  authorizeSuperCoinHold,
  normalizeMobileToE164,
  searchSuperCoinUser,
  type SuperCoinBalanceResponse,
  type SuperCoinIdentity,
  type SuperCoinInitHoldResponse,
  type SuperCoinAuthorizeHoldResponse,
  type SuperCoinSearchResponse,
  type SuperCoinTransactionalPayload,
} from "@/api/supercoinApi";

export const useSuperCoinAccount = (mobile?: string) => {
  const normalizedMobile = normalizeMobileToE164(mobile);
  const identity: SuperCoinIdentity | null = mobile
    ? normalizedMobile
      ? {
        identifier: normalizedMobile,
        type: "MOBILE",
      }
      : null
    : null;

  const requireIdentity = () => {
    if (!identity) {
      throw new Error("User mobile number is required for SuperCoin actions.");
    }

    return identity;
  };

  const searchUserMutation = useMutation<SuperCoinSearchResponse, Error>({
    mutationFn: () => searchSuperCoinUser(requireIdentity()),
  });

  const enrolUserMutation = useMutation<SuperCoinSearchResponse, Error>({
    mutationFn: () => enrolSuperCoinUser(requireIdentity()),
  });

  const balanceMutation = useMutation<SuperCoinBalanceResponse, Error>({
    mutationFn: () => fetchSuperCoinBalance(requireIdentity()),
  });

  return {
    identity,
    searchUserMutation,
    enrolUserMutation,
    balanceMutation,
  };
};

export const useInitSuperCoinHold = () =>
  useMutation<SuperCoinInitHoldResponse, Error, SuperCoinTransactionalPayload>({
    mutationFn: (payload) => initSuperCoinHold(payload),
  });

export const useAuthorizeSuperCoinHold = () =>
  useMutation<
    SuperCoinAuthorizeHoldResponse,
    Error,
    Pick<SuperCoinTransactionalPayload, "identity" | "merchantWalletId" | "merchantTransactionId" | "otp">
  >({
    mutationFn: (payload) => authorizeSuperCoinHold(payload),
  });
