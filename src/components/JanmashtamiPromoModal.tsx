import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Clock } from "lucide-react";
import krsnaImg from "@/assets/dussehraquiz.png";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function JanmashtamiPromoModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
        {/* Backdrop image */}
        <div className="relative h-[280px] overflow-hidden">
          <img
            src={krsnaImg}
            alt="Dussehra"
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
              DUSSEHRA SPECIAL
            </span>
          </div>

          {/* Content overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-4">
            <h2 className="text-[20px] font-extrabold leading-tight text-[#e0e8ff]">
              Happy Dussehra!!
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-[#c5d0f0]">
              After a payment is cancelled, start the{" "}
              <span className="font-bold text-[#e0e8ff]">Dussehra Quiz within 2 minutes</span>{" "}
              and earn{" "}
              <span className="font-bold text-[#e0e8ff]">
                5 bonus SuperCoins
              </span>
              when a new purchase is completed within 5 minutes. They are added after payment and voucher fulfillment.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 px-6 py-3 text-[14px] font-bold text-white backdrop-blur-sm active:scale-[0.97] transition-all"
            >
              <Clock className="h-4 w-4" strokeWidth={2.5} />
              Got it
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
