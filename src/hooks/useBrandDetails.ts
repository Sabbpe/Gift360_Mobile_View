import { useQuery } from "@tanstack/react-query";
import { getBrandDetails } from "@/api/brandDetailsApi";

export const useBrandDetails = (brandId: string, options?: { enabled?: boolean; refetchOnMount?: boolean }) => {
  return useQuery({
    queryKey: ["brand-details", brandId],
    queryFn: () => {
      console.log("🔥 BrandDetails API CALLED with brandId =", brandId);
      return getBrandDetails(brandId);
    },
    enabled: options?.enabled !== undefined ? options.enabled : !!brandId,
    refetchOnMount: options?.refetchOnMount ?? true,
    staleTime: 0,
    // Do not pause when the browser wrongly reports 'offline' (common on mobile WebViews):
    // try the request anyway, so the customer sees the brand or a clear error, never a frozen page.
    networkMode: "always",
  });
};
