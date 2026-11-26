import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ensureScOnlyBrandsLoaded } from "./lib/scOnlyBrands";

// ✅ Configure global defaults for ALL queries
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,   // No refetch on tab switch
      refetchOnMount: false,          // No refetch on component remount
      refetchOnReconnect: false,      // No refetch on network reconnect
      staleTime: 5 * 60 * 1000,      // 5 minutes default cache
      retry: 1,                       // Retry failed requests once
    },
  },
});
console.log("ALL ENV:", import.meta.env);
// Preload the SC_ONLY brand ids so the first Add to Cart / Buy Now click is
// routed correctly without waiting for a round trip.
void ensureScOnlyBrandsLoaded();
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
