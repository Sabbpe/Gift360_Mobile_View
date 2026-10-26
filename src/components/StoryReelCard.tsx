import { useState } from "react";
import { Instagram, Sparkles, ExternalLink, Send } from "lucide-react";
import { STORY_REEL_CAMPAIGN } from "@/config/rewardsConfig";

export default function StoryReelCard() {
  const [reelLink, setReelLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleStoryReelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reelLink.trim()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      // Connect your backend verification endpoint here
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

  return (
    <div className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 border border-purple-500/40 rounded-2xl p-6 text-white shadow-2xl relative overflow-hidden backdrop-blur-xl">
      {/* Ambient Glow Effects */}
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600/90 border border-purple-400/40 text-purple-100 text-xs font-bold rounded-full uppercase tracking-wider mb-2 shadow-sm">
            <Sparkles className="w-3 h-3 text-pink-300 animate-pulse" />
            Story & Reel
          </span>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            {STORY_REEL_CAMPAIGN.campaignTitle}
          </h3>
        </div>
        <div className="p-3 bg-purple-800/80 rounded-2xl border border-purple-500/30 shadow-inner text-pink-400">
          <Instagram className="w-6 h-6" />
        </div>
      </div>

      <p className="text-sm text-purple-200/90 mb-4 leading-relaxed relative z-10">
        Buy a voucher with us, share your experience as a reel or story on Instagram, tag <strong className="text-white font-semibold">{STORY_REEL_CAMPAIGN.brandHandle}</strong>, paste your link below, and submit to win <strong className="text-white font-semibold">{STORY_REEL_CAMPAIGN.rewardCoins} SuperCoins</strong>.
      </p>

      {/* Steps List */}
      <ol className="space-y-2 text-sm text-purple-100 mb-5 list-decimal list-inside font-medium relative z-10 bg-purple-900/40 p-4 rounded-xl border border-purple-700/30">
        <li>Buy any voucher on Gift360</li>
        <li>Post a reel or story on Instagram & tag <span className="text-pink-300 font-bold">{STORY_REEL_CAMPAIGN.brandHandle}</span></li>
        <li>Paste your link here and submit</li>
      </ol>

      {/* Reference / Sample Reel Link Preview */}
      <div className="mb-5 bg-purple-950/70 px-4 py-3 rounded-xl border border-purple-700/50 flex items-center justify-between text-xs relative z-10 shadow-inner">
        <span className="text-purple-300 font-medium">Need help or a reference?</span>
        <a 
          href={STORY_REEL_CAMPAIGN.sampleReelUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-pink-400 font-bold hover:text-pink-300 transition inline-flex items-center gap-1 group"
        >
          View Sample Reel 
          <ExternalLink className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>

      {/* Submission Form */}
      <form onSubmit={handleStoryReelSubmit} className="space-y-3 relative z-10">
        <div className="relative">
          <input 
            type="url" 
            value={reelLink}
            onChange={(e) => setReelLink(e.target.value)}
            placeholder="https://instagram.com/reel/..." 
            required
            className="w-full px-4 py-3 bg-purple-950/90 border border-purple-600/70 rounded-xl text-white placeholder-purple-400/60 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm shadow-inner transition"
          />
        </div>
        <button 
          type="submit" 
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-[length:200%_auto] hover:bg-[position:right_center] text-white font-bold rounded-xl transition-all duration-500 shadow-lg shadow-purple-900/50 text-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <span className="inline-block animate-pulse">Verifying Link...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Submit
            </>
          )}
        </button>
      </form>

      {submitStatus && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-medium text-center border ${submitStatus.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-pink-950/60 border-pink-500/40 text-pink-300'}`}>
          {submitStatus.text}
        </div>
      )}

      <p className="text-xs text-purple-300/70 text-center mt-4 relative z-10 leading-relaxed">
        {STORY_REEL_CAMPAIGN.verificationNotice}
      </p>
    </div>
  );
}
