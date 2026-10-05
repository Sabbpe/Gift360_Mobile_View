import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, ChevronRight, Clock, Loader2 } from "lucide-react";
import krsnaImg from "@/assets/Krsna.jpeg";
import { useAuthContext } from "@/contexts/AuthContext";
import { checkQuizEligibility } from "@/api/rewardApi";

type Props = {
  open: boolean;
  onClose: () => void;
  onStartQuiz: () => void;
};

export default function JanmashtamiPromoModal({ open, onClose, onStartQuiz }: Props) {
  const { user } = useAuthContext();
  const [checking, setChecking] = useState(false);
  const [eligible, setEligible] = useState(true);

  // Call the eligibility API the moment this promo modal box opens, so the
  // "Try Quiz Now" CTA correctly reflects whether the user can play today.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const run = async () => {
      if (!user?.clientId) return;
      setChecking(true);
      try {
        const res = await checkQuizEligibility(user.clientId);
        if (!cancelled) setEligible(res.eligible);
      } catch {
        // Fail open — server still enforces the daily limit.
        if (!cancelled) setEligible(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open, user?.clientId]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
        {/* Backdrop image */}
        <div className="relative h-[280px] overflow-hidden">
          <img
            src={krsnaImg}
            alt="Janmashtami"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient overlay for readability */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,20,80,0.25) 0%, rgba(10,20,80,0.6) 55%, rgba(13,30,90,0.95) 100%)",
            }}
          />

          {/* Decorative sparkle */}
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1a237e]/70 backdrop-blur-sm px-2.5 py-1 text-[9px] font-bold text-white tracking-wide">
              <Sparkles className="h-3 w-3" strokeWidth={2.5} />
              JANMASHTAMI SPECIAL
            </span>
          </div>

          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-4">
            <h2 className="text-[20px] font-extrabold leading-tight text-[#e0e8ff]">
              Happy Janmashtami!
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#c5d0f0]">
              Try our{" "}
              <span className="font-bold text-[#e0e8ff]">Janmashtami Quiz</span>{" "}
              and earn{" "}
              <span className="font-bold text-[#e0e8ff]">
                cashback wallet points
              </span>
              .
            </p>

            {checking ? (
              <button
                type="button"
                disabled
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#1565c0] px-6 py-3 text-[14px] font-bold text-white opacity-70"
              >
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
                Checking…
              </button>
            ) : eligible ? (
              <button
                type="button"
                onClick={onStartQuiz}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1a237e] via-[#283593] to-[#1565c0] px-6 py-3 text-[14px] font-bold text-white shadow-[0_4px_20px_rgba(21,101,192,0.45)] active:scale-[0.97] transition-all"
              >
                Try Quiz Now
                <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-[14px] font-bold text-white backdrop-blur-sm active:scale-[0.97] transition-all"
              >
                <Clock className="h-4 w-4" strokeWidth={2.5} />
                Already played today — come back tomorrow
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
