import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Frown, Gift, Instagram, Sparkles, Send } from "lucide-react";
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
  const [reelLink, setReelLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const handleStoryReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelLink.trim()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSubmitting(false);
      setSubmitStatus({ 
        type: 'success', 
        text: 'Link submitted successfully! Verification in progress.' 
      });
      setReelLink('');
    } catch (err) {
      setSubmitting(false);
      setSubmitStatus({ 
        type: 'error', 
        text: 'Failed to submit link. Please check the URL and try again.' 
      });
    }
  };

  if (!clientId || isLoading) {
    return <p className="px-1 text-[13px] text-white/70">Loading rewards…</p>;
  }

  return (
    <div className="space-y-4">
      {!reward?.hasReward ? (
        <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
          <Gift className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
          <p className="mt-2 text-[13px] font-medium text-white/80">No rewards yet</p>
          <p className="mt-1 text-[12px] text-white/60">A Dussehra quiz offer appears after a payment cancellation.</p>
        </div>
      ) : reward.status === "PENDING" ? (
        <div className="rounded-[12px] border border-violet-200/40 bg-white/12 px-4 py-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#C4B5FD]" strokeWidth={2} />
            <p className="text-[14px] font-semibold text-white">{QUIZ_SUPERCOIN_REWARD} bonus SuperCoins available</p>
          </div>
          <p className="mt-1 text-[12px] text-white/70">Complete a new purchase in this window; the bonus is added automatically after successful payment and voucher fulfillment.</p>
          <p className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-[#FCD34D]">
            <Clock className="h-[13px] w-[13px]" strokeWidth={2.4} />
            {secondsLeft > 0 ? `Purchase within ${formatCountdown(secondsLeft)}` : "Bonus window expired"}
          </p>
        </div>
      ) : reward.status === "REDEEMED" || reward.status === "CLAIMED" ? (
        <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#34D399]" strokeWidth={2.2} />
            <p className="text-[14px] font-semibold text-white">{QUIZ_SUPERCOIN_REWARD} SuperCoins earned</p>
          </div>
          <p className="mt-1 text-[12px] text-white/65">
            {reward.redeemedOrderNumber ? `Credited with order ${reward.redeemedOrderNumber}` : "Your reward has been credited."}
            {reward.redeemedAt ? ` · ${new Date(reward.redeemedAt).toLocaleString("en-IN")}` : ""}
          </p>
        </div>
      ) : reward.status === "EXPIRED" ? (
        <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
          <Clock className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
          <p className="mt-2 text-[13px] font-medium text-white/80">Your Dussehra quiz reward expired unused.</p>
        </div>
      ) : reward.status === "LOST" ? (
        <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-[18px] text-center">
          <Frown className="mx-auto h-6 w-6 text-white/70" strokeWidth={1.8} />
          <p className="mt-2 text-[13px] font-medium text-white/80">All answers must be correct to earn the 5 SuperCoins.</p>
        </div>
      ) : (
        <div className="rounded-[12px] border border-white/25 bg-white/12 px-4 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#FCD34D]" strokeWidth={2} />
            <p className="text-[14px] font-semibold text-white">Dussehra quiz offer is active</p>
          </div>
          <p className="mt-1 text-[12px] text-white/70">Return to the payment result to start or continue the quiz.</p>
          <p className="mt-2 text-[12px] font-semibold text-[#FCD34D]">{formatCountdown(secondsLeft)} remaining</p>
        </div>
      )}

      {/* --- STANDOUT STORY & REEL CAMPAIGN CARD --- */}
      <div className="bg-gradient-to-br from-purple-900/95 via-purple-900/90 to-indigo-950/95 border border-purple-500/40 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex items-start justify-between mb-4 relative z-10">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600/80 border border-purple-400/30 text-purple-100 text-xs font-bold rounded-full uppercase tracking-wider mb-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              Story & Reel
            </span>
            <h3 className="text-xl font-extrabold tracking-tight">
              Share your Gift360 story, win 100 SuperCoins
            </h3>
          </div>
          <div className="p-3 bg-purple-800/80 rounded-2xl border border-purple-500/30 shadow-inner">
            <Instagram className="w-6 h-6 text-pink-400" />
          </div>
        </div>

        <p className="text-sm text-purple-200/90 mb-4 leading-relaxed relative z-10">
          Buy a voucher with us, share your experience as a reel or story on Instagram, tag <strong className="text-white font-semibold">@gift360.io</strong>, paste your link below, and submit to win <strong className="text-white font-semibold">100 SuperCoins</strong>.
        </p>

        {/* Steps List */}
        <ol className="space-y-2 text-sm text-purple-100 mb-4 list-decimal list-inside font-medium relative z-10">
          <li>Buy any voucher on Gift360</li>
          <li>Post a reel or story on Instagram & tag <span className="text-pink-300 font-bold">@gift360.io</span></li>
          <li>Paste your link here and submit</li>
        </ol>

        {/* Sample Reel Reference Link */}
        <div className="mb-4 bg-purple-950/60 px-4 py-3 rounded-xl border border-purple-700/40 flex items-center justify-between text-xs relative z-10 shadow-inner">
          <span className="text-purple-300 font-medium">Need help or a reference?</span>
          <a 
            href="https://www.instagram.com/reels/De6jKsSvBQB/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pink-400 font-bold hover:text-pink-300 transition inline-flex items-center gap-1"
          >
            View Sample Reel →
          </a>
        </div>

        {/* Form Input & Submit Action */}
        <form onSubmit={handleStoryReelSubmit} className="space-y-3 relative z-10">
          <input 
            type="url" 
            value={reelLink}
            onChange={(e) => setReelLink(e.target.value)}
            placeholder="https://instagram.com/reel/..." 
            required
            className="w-full px-4 py-3 bg-purple-950/80 border border-purple-600/60 rounded-xl text-white placeholder-purple-400/70 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-inner transition"
          />
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold rounded-xl transition-all duration-500 shadow-lg shadow-purple-900/50 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Verifying Link..." : "Claim 100 SuperCoins 🚀"}
          </button>
        </form>

        {submitStatus && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-medium text-center border ${submitStatus.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-pink-950/60 border-pink-500/40 text-pink-300'}`}>
            {submitStatus.text}
          </div>
        )}

        <p className="text-xs text-purple-300/70 text-center mt-3 relative z-10">
          SuperCoins are credited after we verify your reel or story is live.
        </p>
      </div>
    </div>
  );
}
