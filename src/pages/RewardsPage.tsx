// pages/RewardsPage.tsx
// /rewards — destination of the home quick-action "Rewards" tile, mirroring
// how "Convert coins" routes to /supercoin-voucher. Renders the exact same
// RewardsModal hub (quiz + Instagram story/reel); closing it returns home.
import { useLocation } from "wouter";
import RewardsModal from "@/components/RewardsModal";

export default function RewardsPage() {
  const [, setLocation] = useLocation();
  return <RewardsModal open onClose={() => setLocation("/")} />;
}
