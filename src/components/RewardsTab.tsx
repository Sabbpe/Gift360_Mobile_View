import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { Gift, Clock, CheckCircle2, Frown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRewardStatus, claimReward, QUIZ_CASHBACK_REWARD } from "@/api/rewardApi";

function formatRupees(amount: number | null | undefined): string {
  return (amount ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRemaining(expiresAt: string): string {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Expired";
  const hours = Math.floor(remainingMs / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export default function RewardsTab({ clientId }: { clientId: string | undefined }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState("");

  const { data: reward, isLoading } = useQuery({
    queryKey: ["rewardStatus", clientId],
    queryFn: () => getRewardStatus(clientId!),
    enabled: !!clientId,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!reward?.hasReward || !reward.expiresAt) return;
    if (reward.status !== "PENDING" && reward.status !== "LOST") return;
    setCountdown(formatRemaining(reward.expiresAt));
    const interval = window.setInterval(() => setCountdown(formatRemaining(reward.expiresAt!)), 1000);
    return () => window.clearInterval(interval);
  }, [reward?.hasReward, reward?.status, reward?.expiresAt]);

  const claimMutation = useMutation({
    mutationFn: () => claimReward(clientId!, reward!.publicId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["rewardStatus", clientId], updated);
      toast({
        title: `₹${formatRupees(updated.cashbackAmountCredited)} cashback credited!`,
        duration: 3000,
      });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      toast({
        title: "Couldn't claim right now",
        description: error.response?.data?.message ?? "Please try again in a moment.",
        duration: 4000,
      });
    },
  });

  if (!clientId || isLoading) {
    return <p className="px-1 text-[13px] text-white/70">Loading rewards…</p>;
  }

  if (!reward?.hasReward) {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[18px] text-center">
        <Gift className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">
          No rewards yet — play the Janmashtami quiz on the Home page to earn one!
        </p>
      </div>
    );
  }

  if (reward.status === "CLAIMED") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[16px]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#34D399]" strokeWidth={2.2} />
          <p className="text-[14px] font-semibold text-white">
            ₹{formatRupees(reward.cashbackAmountCredited)} Cashback claimed
          </p>
        </div>
        <p className="mt-1 text-[11px] text-white/60">
          {reward.claimedAt && `on ${new Date(reward.claimedAt).toLocaleString("en-IN")}`}
        </p>
      </div>
    );
  }

  if (reward.status === "EXPIRED") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[18px] text-center">
        <Clock className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">
          Your cashback reward expired unclaimed.
        </p>
      </div>
    );
  }

  if (reward.status === "LOST") {
    return (
      <div className="rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[18px] text-center">
        <Frown className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
        <p className="mt-2 text-[13px] font-medium text-white/80">
          You didn't win cashback this time. Try again tomorrow!
        </p>
        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-[#FCD34D]">
          <Clock className="h-[13px] w-[13px]" strokeWidth={2.4} />
          Try again in {countdown || "24h 00m 00s"}
        </p>
      </div>
    );
  }

  // PENDING
  return (
    <div className="rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[16px]">
      <p className="text-[14px] font-bold text-white">You won ₹{QUIZ_CASHBACK_REWARD} cashback! 🎉</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#FCD34D]">
        <Clock className="h-[13px] w-[13px]" strokeWidth={2.4} />
        Claim within {countdown || "24h 00m 00s"}
      </p>

      <button
        type="button"
        onClick={() => claimMutation.mutate()}
        disabled={claimMutation.isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#f06da6_0%,#755ff0_100%)] py-3 text-[13px] font-semibold text-white active:scale-95 disabled:opacity-60"
      >
        <Gift className="h-[16px] w-[16px]" strokeWidth={2.2} />
        {claimMutation.isPending ? "Claiming…" : `Claim ₹${QUIZ_CASHBACK_REWARD} Cashback`}
      </button>
    </div>
  );
}
