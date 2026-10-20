import { useQuery } from "@tanstack/react-query";
import { fetchWalletBalance } from "@/api/walletApi";
import type { WalletBalance } from "@/api/walletApi";
import { AxiosError } from "axios";

export const useFetchWallet = (clientId: string | undefined) => {
  return useQuery<WalletBalance, AxiosError>({
    queryKey: ["wallet", clientId],
    queryFn: () => fetchWalletBalance(clientId!),
    enabled: !!clientId, 
    staleTime: 30000,
    // Don't retry a 401 (session is gone, retrying just delays the error by ~7s);
    // retry transient failures (network, 5xx) twice.
    retry: (failureCount, error) => error.response?.status !== 401 && failureCount < 2,
  });
};
