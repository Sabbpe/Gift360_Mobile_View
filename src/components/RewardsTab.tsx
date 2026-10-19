import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Frown, Gift } from "lucide-react";
import { getRewardStatus, QUIZ_SUPERCOIN_REWARD } from "@/api/rewardApi";

function remainingSeconds(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export default function RewardsTab({ clientId }: { clientId: string | undefined }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const { data: reward, isLoading } = useQuery({
    queryKey: ["rewardStatus", clientId],
    queryFn: () => getRewardStatus(clientId!),
    enabled: !!clientId,
    refetchInterval: 10_000,
  });

  const deadline = reward?.status === "PENDING"
    ? reward.expiresAt
    : reward?.quizStartExpiresAt;

  useEffect(() => {
    if (!deadline) return;
    const tick = () => setSecondsLeft(remainingSeconds(deadline));
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [deadline]);

  if (!clientId || isLoading) {
    return <p className="px-1 text-[13px] text-white/70">Loading rewards…</p>;
  }

  if (!reward?.hasReward) {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
        <Gift className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">No rewards yet</p>
        <p className="mt-1 text-[11px] text-white/60">A Dussehra quiz offer appears after a payment cancellation.</p>
      </div>
    );
  }

  if (reward.status === "PENDING") {
    return (
      <div className="rounded-[12px] border border-violet-200/40 bg-white/12 px-4 py-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-[#C4B5FD]" strokeWidth={2} />
          <p className="text-[14px] font-semibold text-white">{QUIZ_SUPERCOIN_REWARD} bonus SuperCoins available</p>
        </div>
        <p className="mt-1 text-[11px] text-white/70">Complete a new purchase in this window; the bonus is added automatically after successful payment and voucher fulfillment.</p>
        <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#FCD34D]">
          <Clock className="h-[13px] w-[13px]" strokeWidth={2.4} />
          {secondsLeft > 0 ? `Purchase within ${formatCountdown(secondsLeft)}` : "Bonus window expired"}
        </p>
      </div>
    );
  }

  if (reward.status === "REDEEMED" || reward.status === "CLAIMED") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#34D399]" strokeWidth={2.2} />
          <p className="text-[14px] font-semibold text-white">{QUIZ_SUPERCOIN_REWARD} SuperCoins redeemed</p>
        </div>
        <p className="mt-1 text-[11px] text-white/65">
          {reward.redeemedOrderNumber ? `Added to order ${reward.redeemedOrderNumber}` : "Your reward has been redeemed."}
          {reward.redeemedAt ? ` · ${new Date(reward.redeemedAt).toLocaleString("en-IN")}` : ""}
        </p>
      </div>
    );
  }

  if (reward.status === "EXPIRED") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
        <Clock className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">Your Dussehra quiz reward expired unused.</p>
      </div>
    );
  }

  if (reward.status === "LOST") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
        <Frown className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">All answers must be correct to earn the 5 SuperCoins.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-[#FCD34D]" strokeWidth={2} />
        <p className="text-[14px] font-semibold text-white">Dussehra quiz offer is active</p>
      </div>
      <p className="mt-1 text-[11px] text-white/70">Return to the payment result to start or continue the quiz.</p>
      <p className="mt-2 text-[11px] font-semibold text-[#FCD34D]">{formatCountdown(secondsLeft)} remaining</p>
    </div>
  );
}
