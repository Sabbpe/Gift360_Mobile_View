import { useState, useEffect, useRef } from "react";
import { MessageSquare } from "lucide-react";

interface FeedbackFloatingButtonProps {
  onClick: () => void;
}

export default function FeedbackFloatingButton({ onClick }: FeedbackFloatingButtonProps) {
  const [expanded, setExpanded] = useState(true);
  const [hasBounced, setHasBounced] = useState(false);
  const idleTimer = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY > 200) {
        setExpanded(false);
      } else {
        setExpanded(true);
        clearTimeout(idleTimer.current);
        idleTimer.current = window.setTimeout(() => setExpanded(false), 3000);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // One-time bounce on mount
    const t = setTimeout(() => setHasBounced(true), 1200);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(idleTimer.current);
      clearTimeout(t);
    };
  }, []);

  return (
    <div className="fixed bottom-[72px] right-4 z-40">
      <button
        onClick={onClick}
        className={`flex items-center justify-center active:scale-90 transition-all duration-300 ease-out ${
          expanded ? "h-12 rounded-full pl-3.5 pr-4 gap-2" : "h-12 w-12 rounded-full"
        } ${!hasBounced ? "animate-bounce-once" : ""}`}
        style={{
          background: "linear-gradient(135deg, #7C3AED, #5B3FD9)",
          boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
        }}
        aria-label="Open feedback"
      >
        <MessageSquare className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
        <span
          className={`text-xs font-semibold text-white whitespace-nowrap overflow-hidden transition-all duration-300 ${
            expanded ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          Feedback
        </span>
      </button>

      <style>{`
        @keyframes bounce-once {
          0%, 100% { transform: translateY(0); }
          20% { transform: translateY(-8px); }
          40% { transform: translateY(-4px); }
          60% { transform: translateY(-2px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.8s ease-out 0.5s 1;
        }
      `}</style>
    </div>
  );
}
