import { useQuery } from "@tanstack/react-query";
import { fetchOccasions } from "../api/brandsApi";

export const useOccasions = () => {
  return useQuery({
    queryKey: ["occasions"],
    queryFn: fetchOccasions,
    staleTime: 10 * 60 * 1000,
  });
};
