import wordmark from "@/assets/gift360-wordmark.png";
import gift360Logo from "@/assets/gift360-logo.png";
import { ChevronRight } from "lucide-react";
import { StatusBar } from "./StatusBar";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

export const WelcomeScreen = ({ onNext, onSkip }: Props) => (
  <div className="relative w-full h-full overflow-hidden bg-gradient-welcome anim-fade-in-slow flex flex-col">
    <StatusBar />

    <div
      className="absolute -top-10 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, rgba(255,190,120,0.42), transparent 72%)" }}
    />
    <div
      className="absolute top-40 right-[-20px] h-28 w-28 rounded-full blur-3xl"
      style={{ background: "radial-gradient(circle, rgba(125,110,242,0.24), transparent 72%)" }}
    />

    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-40 w-40 rounded-full anim-logo-blast"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,224,194,0.72) 40%, rgba(255,255,255,0) 74%)" }}
        />
        <div className="relative z-10 anim-logo-burst">
          <img
            src={gift360Logo}
            alt="Gift360 logo"
            className="mx-auto h-24 w-24 object-contain"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </div>
      <div className="mt-5 anim-scale-in-slow">
        <img
          src={wordmark}
          alt="Gift360"
          className="w-72 h-auto object-contain"
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <p className="mt-3 text-base font-medium text-foreground tracking-tight anim-fade-up delay-300">
        Gift Smatter, Choose Freely
      </p>
      <p className="mt-2 text-sm text-muted-foreground anim-fade-up delay-300">
        Swipe left to explore how Gift360 works.
      </p>
    </div>

    <div className="mt-auto px-6 pb-6 pt-4">
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

    <style>{`
      @keyframes logo-burst {
        0% { opacity: 0; transform: scale(0.35); }
        45% { opacity: 1; transform: scale(1.16); }
        70% { transform: scale(0.96); }
        100% { opacity: 1; transform: scale(1); }
      }
      @keyframes logo-blast {
        0% { opacity: 0; transform: scale(0.2); }
        40% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0; transform: scale(1.8); }
      }
      .anim-logo-burst { animation: logo-burst 1s cubic-bezier(.22,1,.36,1) both; }
      .anim-logo-blast { animation: logo-blast 1.1s ease-out both; }
    `}</style>
  </div>
);
