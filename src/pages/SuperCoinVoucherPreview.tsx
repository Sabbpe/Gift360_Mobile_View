import { useEffect } from "react";
import { useLocation } from "wouter";
import SuperCoinsBrandModal, {
  SUPERCOIN_FEATURED_BRAND_ID,
} from "@/components/SuperCoinsBrandModal";

export default function SuperCoinVoucherPreview() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Buffer a history entry so the browser Back gesture always resolves
    // here instead of leaving the tab, then force it to home.
    window.history.pushState({ scPreview: true }, "", window.location.pathname);
    const onPop = () => setLocation("/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#F3F5F9]">
      <SuperCoinsBrandModal
        open
        brandId={SUPERCOIN_FEATURED_BRAND_ID}
        onClose={() => setLocation("/")}
      />
    </div>
  );
}
