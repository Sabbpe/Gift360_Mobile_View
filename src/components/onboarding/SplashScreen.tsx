import { allBrandList } from "@/assets/pp-brands";
import gift360Logo from "@/assets/gift360-logo.png";
import wordmark from "@/assets/gift360-wordmark.png";
import { ChevronRight } from "lucide-react";
import { StatusBar } from "./StatusBar";

// Splits brand list into N columns, repeated to allow seamless loop
const makeColumn = (offset: number, count: number) => {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(allBrandList[(offset + i) % allBrandList.length]);
  }
  return items;
};

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const SplashScreen = ({ onNext, onSkip }: Props) => {
  const cols = [0, 4, 8, 1, 6].map((o) => makeColumn(o, 12));

  return (
    <div className="relative w-full h-full bg-white overflow-hidden">
      <StatusBar />

      {/* Scrolling brand columns — alternating up/down like a banner (~4s loop) */}
      <div className="absolute inset-0 top-0 flex gap-2 px-2 pt-10 opacity-100">
        {cols.map((col, i) => (
          <div
            key={i}
            className={`flex-1 flex flex-col gap-2 ${i % 2 === 0 ? "anim-col-up" : "anim-col-down"}`}
          >
            {[...col, ...col].map((b, j) => (
              <div
                key={j}
                className="aspect-square rounded-2xl bg-white shadow-tile flex items-center justify-center p-1.5"
              >
                <img
                  src={b.src}
                  alt={b.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Soft white fade overlay that ramps up near end → dissolves into Welcome */}
      <div
        className="absolute left-1/2 top-[26%] z-20 flex -translate-x-1/2 flex-col items-center px-6 text-center"
      >
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-36 w-36 rounded-full anim-logo-blast"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,229,194,0.82) 42%, rgba(255,255,255,0) 76%)",
            }}
          />
          <div className="relative z-10 anim-logo-burst rounded-full bg-white/85 p-3 shadow-card-soft">
            <img
              src={gift360Logo}
              alt="Gift360 logo"
              className="h-20 w-20 object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>
        </div>
        <img
          src={wordmark}
          alt="Gift360"
          className="mt-4 w-52 object-contain anim-fade-up"
          loading="eager"
          fetchPriority="high"
        />
        <p className="mt-2 text-sm font-medium text-foreground/80 anim-fade-up delay-300">
          Swipe left or tap next to continue
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white via-white/92 to-transparent px-6 pb-6 pt-16">
        <div className="flex items-center justify-center gap-1.5 pb-4">
          <span className="w-6 h-1.5 rounded-full bg-primary" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-base font-medium text-foreground/80">
            Skip
          </button>
          <button
            onClick={onNext}
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card-soft hover:scale-105 transition-transform"
            aria-label="Next"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </div>
      </div>

      <div className="absolute inset-0 bg-white/10 pointer-events-none anim-splash-dissolve" />
      <style>{`
        @keyframes splash-dissolve {
          0%, 72% { opacity: 0; }
          100% { opacity: 1; }
        }
        .anim-splash-dissolve { animation: splash-dissolve 4s ease-in forwards; }
        @keyframes logo-burst {
          0% { opacity: 0; transform: scale(0.3); }
          42% { opacity: 1; transform: scale(1.14); }
          72% { transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes logo-blast {
          0% { opacity: 0; transform: scale(0.24); }
          40% { opacity: 1; transform: scale(1.12); }
          100% { opacity: 0; transform: scale(1.9); }
        }
        .anim-logo-burst { animation: logo-burst 0.95s cubic-bezier(.22,1,.36,1) both; }
        .anim-logo-blast { animation: logo-blast 1.1s ease-out both; }
      `}</style>
    </div>
  );
};
