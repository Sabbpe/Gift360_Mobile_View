import { useMutation } from "@tanstack/react-query";
import {
  enrolSuperCoinUser,
  fetchSuperCoinBalance,
  normalizeMobileToE164,
  searchSuperCoinUser,
  type SuperCoinBalanceResponse,
  type SuperCoinIdentity,
  type SuperCoinSearchResponse,
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
