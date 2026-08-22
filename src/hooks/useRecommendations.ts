import { useQuery } from "@tanstack/react-query";
import { fetchRecommendations } from "../api/brandsApi";

export const useRecommendations = (occasion: string) => {
  return useQuery({
    queryKey: ["recommendations", occasion],
    queryFn: () => fetchRecommendations(occasion),
    enabled: !!occasion,
  });
};
