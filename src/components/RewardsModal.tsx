import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  X, Coins, ArrowRight, Instagram, CheckCircle, Loader2, Sparkles, Gift,
  ExternalLink,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  getRewardStatus,
  startQuizFromBanner,
  QUIZ_SUPERCOIN_REWARD,
  type QuizRewardStatus,
} from "@/api/rewardApi";
import { submitInstagramStory } from "@/api/storyApi";
import JanmashtamiQuizModal from "@/components/JanmashtamiQuizModal";
import { trackEvent } from "@/lib/analytics";

type Props = {
  open: boolean;
  onClose: () => void;
};

/** SuperCoins credited for an approved Instagram reel or story. Must match the backend. */
const STORY_SUPERCOIN_REWARD = 100;

const INSTAGRAM_URL_RE = /^https?:\/\/([\w-]+\.)*instagram\.com\/.+/i;

/**
 * Rewards hub opened from the assistant's Quick Actions.
 * - The same quiz banner as the home Instant Gifting carousel, with the full
 *   quiz journey (start from banner → modal → win redirects to SuperCoin modal).
 * - The Instagram story/reel callout: buy a voucher, share a story, paste the
 *   link, submit to win SuperCoins (submission goes to the backend).
 */
export default function RewardsModal({ open, onClose }: Props) {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();

  // ── Quiz state ──
  const [rewardStatus, setRewardStatus] = useState<QuizRewardStatus | null>(null);
  const [quizReward, setQuizReward] = useState<QuizRewardStatus | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizNote, setQuizNote] = useState<string | null>(null);

  // ── Instagram story state ──
  const [storyUrl, setStoryUrl] = useState("");
  const [storySending, setStorySending] = useState(false);
  const [storyDone, setStoryDone] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuizNote(null);
    setStoryUrl("");
    setStoryDone(false);
    setStoryError(null);
    if (!user?.clientId) return;
    getRewardStatus(user.clientId)
      .then(setRewardStatus)
      .catch(() => { /* banner just falls back to the default playable copy */ });
  }, [open, user?.clientId]);

  const quizEarned = rewardStatus?.status === "REDEEMED" || rewardStatus?.status === "CLAIMED";
  const quizWon = rewardStatus?.status === "PENDING"
    && !!rewardStatus.expiresAt && new Date(rewardStatus.expiresAt).getTime() > Date.now();

  const handleQuizPlay = useCallback(async () => {
    setQuizNote(null);
    if (!user?.clientId) { setLocation("/login"); return; }
    if (quizWon) { setLocation("/supercoin-voucher"); return; }
    setQuizBusy(true);
    try {
      const reward = await startQuizFromBanner(user.clientId);
      if (reward?.publicId && reward.quizStartExpiresAt
          && (reward.status === "AVAILABLE" || reward.status === "IN_PROGRESS")) {
        setQuizReward(reward);
        setQuizOpen(true);
      } else if (reward?.status === "PENDING") {
        setLocation("/supercoin-voucher");
      } else {
        setQuizNote("You have used your quiz attempts for today. Try again tomorrow.");
      }
    } catch {
      setQuizNote("The quiz is not available right now. Please try again.");
    } finally {
      setQuizBusy(false);
    }
  }, [user?.clientId, quizWon, setLocation]);

  const handleQuizClose = useCallback(async () => {
    setQuizOpen(false);
    if (!user?.clientId) return;
    try {
      const fresh = await getRewardStatus(user.clientId, quizReward?.publicId ?? undefined);
      setRewardStatus(fresh);
      if (fresh?.status === "PENDING") setLocation("/supercoin-voucher");
    } catch { /* ignore */ }
  }, [user?.clientId, quizReward?.publicId, setLocation]);

  const storyUrlValid = INSTAGRAM_URL_RE.test(storyUrl.trim());

  const handleStorySubmit = async () => {
    if (!user?.clientId) { setLocation("/login"); return; }
    if (!storyUrlValid || storySending) return;
    setStorySending(true);
    setStoryError(null);
    try {
      await submitInstagramStory(user.clientId, storyUrl.trim());
      trackEvent("instagram_story_submitted", {});
      setStoryDone(true);
    } catch (err: any) {
      setStoryError(err?.message || "Could not submit your story link. Please try again.");
    } finally {
      setStorySending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] bg-white rounded-xl shadow-xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-t-xl p-5 text-white flex-shrink-0 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-300" />
              Rewards
            </h2>
            <p className="text-sm text-purple-100">Play the quiz and share your story to win SuperCoins</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close rewards"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ── Quiz banner (same look as the home Instant Gifting slide) ── */}
          <div
            className="relative w-full flex items-center justify-between px-4 py-4 gap-3 rounded-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B2B99 100%)" }}
          >
            <div className="flex-1 min-w-0 space-y-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider text-[#5B2B99] bg-[#F7D46B]">
                QUIZ
              </span>
              {quizEarned ? (
                <>
                  <h3 className="text-[15px] font-bold text-white leading-tight">Quiz reward earned</h3>
                  <p className="text-[11px] text-white/85 leading-snug">
                    Your {QUIZ_SUPERCOIN_REWARD} bonus SuperCoins have been credited. Thanks for playing.
                  </p>
                </>
              ) : quizWon ? (
                <>
                  <h3 className="text-[15px] font-bold text-white leading-tight">You won! Buy now to get {QUIZ_SUPERCOIN_REWARD} SuperCoins</h3>
                  <p className="text-[11px] text-white/85 leading-snug">
                    Complete a purchase before the timer runs out and {QUIZ_SUPERCOIN_REWARD} bonus SuperCoins are credited after your voucher is issued.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-[15px] font-bold text-white leading-tight">Answer 5 questions, win {QUIZ_SUPERCOIN_REWARD} SuperCoins</h3>
                  <p className="text-[11px] text-white/85 leading-snug">
                    {quizNote || "Get all 5 right, then buy before the timer runs out and we credit 5 bonus SuperCoins."}
                  </p>
                </>
              )}
              {!quizEarned && (
                <button
                  type="button"
                  onClick={handleQuizPlay}
                  disabled={quizBusy}
                  className="mt-1 inline-flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-[11px] font-bold text-[#5B2B99] bg-white shadow-md active:scale-[0.97] transition-all disabled:opacity-60"
                >
                  {quizBusy ? "Opening..." : quizWon ? "Buy now" : "Play now"}
                  <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <div className="w-[64px] h-[64px] flex-shrink-0 flex items-center justify-center rounded-full bg-white/15">
              <Coins className="h-8 w-8 text-[#F7D46B]" strokeWidth={1.8} />
            </div>
          </div>

          {/* ── Instagram story callout ── */}
          <div
            className="relative w-full rounded-xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #7C3AED 100%)" }}
          >
            {/* Decorative gold glow */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#F7D46B]/20 blur-2xl" />

            {/* Header */}
            <div className="relative px-4 pt-4 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider text-[#4C1D95] bg-[#F7D46B]">
                  STORY &amp; REEL
                </span>
                <h3 className="text-[15px] font-bold text-white leading-tight">
                  Share your Gift360 story, win {STORY_SUPERCOIN_REWARD} SuperCoins
                </h3>
                <p className="text-[11px] text-white/85 leading-snug">
                  Bought a voucher? Post your experience as an Instagram reel or story,
                  tag <span className="font-bold text-[#F7D46B]">@gift360.io</span> in the
                  post, then paste your link below — earn{" "}
                  <span className="font-bold text-[#F7D46B]">{STORY_SUPERCOIN_REWARD} SuperCoins</span>{" "}
                  once we verify it.
                </p>
              </div>
              <div className="w-[64px] h-[64px] flex-shrink-0 flex items-center justify-center rounded-full bg-white/15 ring-2 ring-[#F7D46B]/40">
                <Instagram className="h-8 w-8 text-[#F7D46B]" strokeWidth={1.8} />
              </div>
            </div>

            {/* How it works — structured steps */}
            <div className="relative px-4 pt-3 space-y-1.5">
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#F7D46B]">
                HOW IT WORKS
              </p>
              <ol className="space-y-1.5">
                <li className="flex items-start gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[#F7D46B] text-[#4C1D95] text-[9px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-snug">
                      Buy any Gift360 voucher
                    </p>
                    <p className="text-[10px] text-white/70 leading-snug">
                      Complete your purchase before you post.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[#F7D46B] text-[#4C1D95] text-[9px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-snug">
                      Post a reel or story on Instagram
                    </p>
                    <p className="text-[10px] text-white/70 leading-snug">
                      Share your genuine experience with the voucher.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 rounded-lg bg-[#F7D46B]/15 ring-1 ring-[#F7D46B]/60 px-2.5 py-2">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[#F7D46B] text-[#4C1D95] text-[9px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-snug">
                      Tag <span className="text-[#F7D46B]">@gift360.io</span> in the post
                    </p>
                    <p className="text-[10px] text-white/70 leading-snug">
                      Mention us in the caption — this is how we find your entry.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-2 rounded-lg bg-white/10 px-2.5 py-2">
                  <span className="mt-0.5 w-4 h-4 shrink-0 rounded-full bg-[#F7D46B] text-[#4C1D95] text-[9px] font-bold flex items-center justify-center">
                    4
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-semibold text-white leading-snug">
                      Paste your link here and submit
                    </p>
                    <p className="text-[10px] text-white/70 leading-snug">
                      We check it&apos;s live, then credit your SuperCoins.
                    </p>
                  </div>
                </li>
              </ol>

              {/* Reference reel — the look to copy while posting */}
              <a
                href="https://www.instagram.com/reels/De6jKsSvBQB/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-white/10 border border-[#F7D46B]/50 px-3 py-2 hover:bg-white/15 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#F7D46B] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10.5px] font-semibold text-white leading-snug">
                    Posting reference — see the example reel
                  </p>
                  <p className="text-[9.5px] text-white/65 leading-snug truncate">
                    Match this look and style for your post
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[#F7D46B] shrink-0" />
              </a>
            </div>

            {/* Link submission form */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold tracking-[0.12em] text-[#F7D46B]">
                YOUR INSTAGRAM LINK
              </p>
              {storyDone ? (
                <div className="flex items-start gap-2 rounded-lg bg-white/95 px-3 py-2.5">
                  <CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-snug text-gray-800 font-medium">
                    Thanks! Your story link is submitted. Your {STORY_SUPERCOIN_REWARD} SuperCoins will be credited after verification.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      inputMode="url"
                      value={storyUrl}
                      onChange={(e) => setStoryUrl(e.target.value)}
                      placeholder="https://instagram.com/reel/..."
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/95 border border-white/30 text-[12px] text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-amber-300 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleStorySubmit}
                      disabled={!storyUrlValid || storySending}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[12px] font-bold text-[#5B2B99] bg-[#F7D46B] shadow-md active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {storySending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                      {storySending ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                  {storyError && (
                    <p className="text-[11px] font-medium text-red-200">{storyError}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-3 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            SuperCoins are credited after we verify your reel or story is live.
          </p>
        </div>
      </div>

      {/* Same quiz journey as the home banner */}
      {quizReward?.publicId && quizReward.quizStartExpiresAt && (
        <JanmashtamiQuizModal
          open={quizOpen}
          onClose={handleQuizClose}
          rewardPublicId={quizReward.publicId}
          quizStartExpiresAt={quizReward.quizStartExpiresAt}
        />
      )}
    </div>
  );
}
