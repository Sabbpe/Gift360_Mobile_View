import { useState, useEffect } from "react";
import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

const COACHMARK_KEY = "sc_header_coachmark_seen";
const EXPAND_INTERVAL_MS = 3000;
const COLLAPSE_DELAY_MS = 2500;

function hasSeenCoachmark(): boolean { return localStorage.getItem(COACHMARK_KEY) === "true"; }
function markCoachmarkSeen() { localStorage.setItem(COACHMARK_KEY, "true"); }

interface SuperCoinHeaderIconProps {
  onClick: () => void;
  frozen?: boolean;
}

export default function SuperCoinHeaderIcon({ onClick, frozen = false }: SuperCoinHeaderIconProps) {
  const [expanded, setExpanded] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [showCoachmark, setShowCoachmark] = useState(false);

  useEffect(() => {
    if (frozen) return;
    if (!hasSeenCoachmark()) {
      const t = setTimeout(() => { setShowCoachmark(true); markCoachmarkSeen(); }, 1200);
      const dismiss = setTimeout(() => setShowCoachmark(false), 5200);
      return () => { clearTimeout(t); clearTimeout(dismiss); };
    }
  }, [frozen]);

  useEffect(() => {
    if (frozen) return;
    const expand = () => {
      setExpanded(true);
      setSpinning(true);
      setTimeout(() => setSpinning(false), 600);
      setTimeout(() => setExpanded(false), COLLAPSE_DELAY_MS);
    };

    const interval = setInterval(expand, EXPAND_INTERVAL_MS);
    const first = setTimeout(expand, 800);

    return () => { clearInterval(interval); clearTimeout(first); };
  }, [frozen]);

  return (
    <div className="relative shrink-0">
      <style>{`
        @keyframes sc-pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,200,0,0); filter: drop-shadow(0 0 0 rgba(255,200,0,0)); }
          50% { box-shadow: 0 0 8px 3px rgba(255,200,0,0.35); filter: drop-shadow(0 0 6px rgba(255,200,0,0.5)); }
        }
        @keyframes sc-coin-spin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.1); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes sc-gold-ring {
          0% { transform: scale(0.8); opacity: 0.8; border-color: rgba(255,200,0,0.6); }
          100% { transform: scale(1.8); opacity: 0; border-color: rgba(255,200,0,0); }
        }
        @keyframes sc-bounce-in {
          0% { width: 28px; }
          50% { width: 116px; }
          75% { width: 108px; }
          100% { width: 110px; }
        }
        @keyframes sc-bounce-out {
          0% { width: 110px; }
          50% { width: 22px; }
          75% { width: 32px; }
          100% { width: 28px; }
        }
        .sc-collapsed { animation: sc-pulse-glow 2s ease-in-out infinite; }
        .sc-spin { animation: sc-coin-spin 0.6s ease-in-out; }
        .sc-expand { animation: sc-bounce-in 1s cubic-bezier(0.22,1,0.36,1) forwards; }
        .sc-collapse { animation: sc-bounce-out 0.8s ease-in forwards; }
        .sc-gold-ring {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 2px solid rgba(255,200,0,0.6);
          animation: sc-gold-ring 1.5s ease-out infinite;
          pointer-events: none;
        }
      `}</style>

      <button
        onClick={onClick}
        aria-label="Convert SuperCoins to gift voucher"
        className={`relative flex items-center gap-1 h-7 rounded-lg overflow-hidden ${frozen ? "opacity-40 grayscale" : ""}`}
        style={{
          width: expanded ? 110 : 28,
          padding: expanded ? "0 10px 0 6px" : "0",
          background: expanded
            ? "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%)"
            : "transparent",
        }}
      >
        <img
          src={superCoinImg}
          alt=""
          className={`h-[18px] w-[18px] shrink-0 object-contain relative z-10 ${spinning ? "sc-spin" : ""}`}
        />
        {expanded && <span className="sc-gold-ring" style={{ inset: "-3px" }} />}
        {expanded && (
          <span className="text-[9px] font-semibold text-white whitespace-nowrap leading-none animate-in fade-in slide-in-from-left-1 duration-300">
            Convert coins
          </span>
        )}
      </button>

      {showCoachmark && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[60] animate-in fade-in slide-in-from-top-1 duration-300"
          onClick={() => setShowCoachmark(false)}
        >
          <div className="relative bg-white rounded-xl px-3.5 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] max-w-[180px] cursor-pointer">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCoachmark(false); }}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500"
            >
              ✕
            </button>
            <p className="text-[10px] font-medium text-gray-700 leading-[14px]">
              Convert SuperCoins to a gift voucher, right here.
            </p>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 rounded-[2px]" />
          </div>
        </div>
      )}
    </div>
  );
}
