import { ChevronRight, Signal, Wifi, BatteryFull } from "lucide-react";
import gift360Logo from "@/assets/gift360-logo.png";
import student from "@/assets/onboard-student.png";
import businessman from "@/assets/onboard-businessman.png";
import itEmployee from "@/assets/onboard-itemployee.png";
import couple from "@/assets/onboard-couple.png";
import housewife from "@/assets/onboard-housewife.png";
import collegegirl from "@/assets/onboard-collegegirl.png";
import senior from "@/assets/onboard-senior.png";
import shopkeeper from "@/assets/onboard-shopkeeper.png";
import gigworker from "@/assets/onboard-gigworker.png";
import { brands } from "@/assets/pp-brands";
import { StatusBar } from "./StatusBar";

interface Props {
  onNext: () => void;
  onSkip: () => void;
}

/**
 * Onboarding 1 — "Gifting for Everyone". A collage of nine Indian
 * characters surrounds a phone. Inside the phone, brand vouchers slide
 * horizontally in three rows. Brand tiles use real images where we have
 * them and brand-colored wordmarks for the rest.
 */

type BrandTile =
  | { kind: "img"; src: string; alt: string }
  | {
      kind: "text";
      label: string;
      bg: string;
      color: string;
      font?: string;
      weight?: number;
      italic?: boolean;
    };

const txt = (
  label: string,
  bg: string,
  color: string,
  opts: { font?: string; weight?: number; italic?: boolean } = {}
): BrandTile => ({ kind: "text", label, bg, color, ...opts });

const brandTiles: BrandTile[] = [
  { kind: "img", src: brands.amazon, alt: "Amazon" },
  { kind: "img", src: brands.flipkart, alt: "Flipkart" },
  { kind: "img", src: brands.myntra, alt: "Myntra" },
  txt("Domino's", "#006491", "#fff", { font: "7px", italic: true }),
  txt("Zepto", "#7B3FE4", "#FFE249", { font: "9px" }),
  txt("blinkit", "#F8CB46", "#1A1A1A", { font: "9px" }),
  txt("Trends", "#E63946", "#fff", { font: "8px" }),
  txt("Westside", "#0E0E0E", "#fff", { font: "7px" }),
  txt("BMS", "#C8102E", "#fff", { font: "10px" }),
  txt("Decathlon", "#0082C3", "#fff", { font: "6px" }),
  txt("M&S", "#00A859", "#fff", { font: "10px" }),
  txt("bigbasket", "#84C225", "#fff", { font: "6px" }),
  txt("M", "#FFC72C", "#DA291C", { font: "20px", weight: 900 }),
  txt("KFC", "#E4002B", "#fff", { font: "9px" }),
  txt("Starbucks", "#006241", "#fff", { font: "6px" }),
  txt("STEAM", "#1B2838", "#66C0F4", { font: "7px" }),
  txt("Bhima", "#A8163A", "#FFD700", { font: "8px", italic: true }),
  txt("Joyalukkas", "#A50034", "#FFD700", { font: "5.5px" }),
  txt("cult.fit", "#0E0E0E", "#FF1744", { font: "8px" }),
  txt("Tanishq", "#A8163A", "#FFD700", { font: "7px", italic: true }),
  { kind: "img", src: brands.puma, alt: "Puma" },
  txt("MakeMyTrip", "#EB2026", "#003E7E", { font: "5.5px", weight: 900 }),
];

const TileImg = ({ t, size }: { t: BrandTile; size: number }) => (
  <div
    className="shrink-0 rounded-[7px] bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden"
    style={{ width: size, height: size }}
  >
    {t.kind === "img" ? (
      <img
        src={t.src}
        alt={t.alt}
        className="w-full h-full object-contain p-1"
        loading="eager"
      />
    ) : (
      <div
        className="w-full h-full flex items-center justify-center text-center px-0.5"
        style={{
          background: t.bg,
          color: t.color,
          fontSize: t.font ?? "8px",
          fontWeight: t.weight ?? 800,
          fontStyle: t.italic ? "italic" : "normal",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {t.label}
      </div>
    )}
  </div>
);

const MarqueeRow = ({
  items,
  speedClass,
  reverse = false,
  size = 32,
}: {
  items: BrandTile[];
  speedClass: string;
  reverse?: boolean;
  size?: number;
}) => (
  <div className="overflow-hidden w-full">
    <div
      className={`flex gap-1.5 w-max ${speedClass}`}
      style={reverse ? { animationDirection: "reverse" } : undefined}
    >
      {[...items, ...items].map((t, i) => (
        <TileImg key={i} t={t} size={size} />
      ))}
    </div>
  </div>
);

const row1 = brandTiles.filter((_, i) => i % 3 === 0);
const row2 = brandTiles.filter((_, i) => i % 3 === 1);
const row3 = brandTiles.filter((_, i) => i % 3 === 2);

/* Character collage thumbnail */
const PortraitChip = ({
  src,
  alt,
  size,
  className = "",
  ringColor = "rgba(124, 109, 242, 0.45)",
  delay = "",
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
  ringColor?: string;
  delay?: string;
}) => (
  <div
    className={`absolute rounded-full bg-white anim-float ${className} ${delay}`}
    style={{
      width: size,
      height: size,
      boxShadow: `0 6px 16px -4px rgba(15,23,42,0.25), 0 0 0 3px #fff, 0 0 0 5px ${ringColor}`,
    }}
  >
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover object-top rounded-full"
      loading="eager"
    />
  </div>
);

export const Onboarding1 = ({ onNext, onSkip }: Props) => {
  return (
    <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
      <StatusBar />

      {/* Decorative blue circles */}
      <div className="absolute top-20 right-0 w-20 h-20 rounded-full bg-sky-200/70" />
      <div className="absolute top-32 left-6 w-3 h-3 rounded-full bg-sky-300" />
      <div className="absolute top-12 left-16 w-2 h-2 rounded-full bg-sky-300" />
      <div className="absolute bottom-1/3 left-0 w-14 h-14 rounded-full bg-sky-200/60" />
      <div className="absolute bottom-1/2 right-8 w-3 h-3 rounded-full bg-sky-300" />

      {/* Hero stage */}
      <div className="relative flex-1 flex items-center justify-center pt-2 pb-2">
        {/* Soft halo behind phone */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-sky-100/80 blur-2xl" />

        {/* Floating Gift360 logo tag */}
        <div className="absolute left-2 top-1 bg-white rounded-xl shadow-tile px-2 py-1 anim-bob z-30 border border-amber-100">
          <img
            src={gift360Logo}
            alt="Gift360"
            className="h-6 w-auto object-contain"
          />
        </div>

        {/* Character collage — surrounds the phone with bigger portraits */}
        <PortraitChip
          src={collegegirl}
          alt="College student"
          size={70}
          className="left-2 top-12"
          ringColor="rgba(244,114,182,0.45)"
        />
        <PortraitChip
          src={couple}
          alt="Married couple"
          size={62}
          className="left-24 top-1"
          ringColor="rgba(244,63,94,0.4)"
          delay="delay-100"
        />
        <PortraitChip
          src={senior}
          alt="Senior citizen"
          size={66}
          className="right-2 top-3"
          ringColor="rgba(167,139,250,0.5)"
          delay="delay-200"
        />
        <PortraitChip
          src={housewife}
          alt="Housewife"
          size={74}
          className="left-1 bottom-6"
          ringColor="rgba(45,212,191,0.5)"
          delay="delay-100"
        />
        <PortraitChip
          src={shopkeeper}
          alt="Shopkeeper"
          size={62}
          className="left-24 bottom-0"
          ringColor="rgba(251,191,36,0.5)"
          delay="delay-300"
        />
        <PortraitChip
          src={gigworker}
          alt="Gig worker"
          size={66}
          className="right-2 bottom-2"
          ringColor="rgba(251,146,60,0.55)"
          delay="delay-400"
        />
        <PortraitChip
          src={businessman}
          alt="Businessman"
          size={68}
          className="right-1 bottom-24"
          ringColor="rgba(100,116,139,0.5)"
          delay="delay-200"
        />
        <PortraitChip
          src={itEmployee}
          alt="IT employee"
          size={60}
          className="left-1 top-36"
          ringColor="rgba(59,130,246,0.5)"
          delay="delay-300"
        />
        <PortraitChip
          src={student}
          alt="Student"
          size={56}
          className="right-2 top-32"
          ringColor="rgba(56,189,248,0.55)"
          delay="delay-400"
        />

        {/* Center phone with brand marquee */}
        <div className="relative z-20 anim-scale-in">
          <div
            className="relative rounded-[26px] p-[3px] shadow-xl"
            style={{
              background:
                "linear-gradient(160deg, #1f2937 0%, #0f172a 60%, #1f2937 100%)",
            }}
          >
            <span className="absolute right-[-2px] top-12 w-[3px] h-8 rounded-r bg-slate-700" />
            <span className="absolute left-[-2px] top-10 w-[3px] h-5 rounded-l bg-slate-700" />
            <span className="absolute left-[-2px] top-16 w-[3px] h-8 rounded-l bg-slate-700" />

            <div className="rounded-[24px] bg-black p-1">
              <div className="relative w-[148px] h-[260px] rounded-[20px] bg-gradient-to-b from-sky-50 via-white to-sky-50 overflow-hidden flex flex-col">
                {/* Dynamic island */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-3 rounded-full bg-black z-10" />

                {/* Status bar */}
                <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5 text-[7px] font-semibold text-slate-700">
                  <span>9:41</span>
                  <span className="w-12" />
                  <span className="flex items-center gap-0.5">
                    <Signal className="w-2 h-2" />
                    <Wifi className="w-2 h-2" />
                    <BatteryFull className="w-2.5 h-2.5" />
                  </span>
                </div>

                {/* App header */}
                <div className="px-2.5 pt-3 pb-1.5 flex items-center gap-1.5">
                  <img
                    src={gift360Logo}
                    alt="Gift360"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div className="px-2.5 pb-1">
                  <div className="text-[7px] text-muted-foreground leading-tight">
                    300+ top brands
                  </div>
                </div>

                {/* Moving brand rows */}
                <div className="flex flex-col gap-1.5 px-1.5 mt-1">
                  <MarqueeRow items={row1} speedClass="anim-banner-x-fast" />
                  <MarqueeRow items={row2} speedClass="anim-banner-x" reverse />
                  <MarqueeRow items={row3} speedClass="anim-banner-x-fast" />
                </div>

                {/* Footer pill */}
                <div className="mt-auto px-3 pb-3 pt-2">
                  <div className="bg-primary text-primary-foreground text-[8px] font-semibold rounded-full py-1 text-center shadow-sm">
                    Buy a Voucher
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-10 h-[3px] rounded-full bg-slate-300" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page indicator */}
      <div className="flex items-center justify-center gap-1.5 pb-3">
        <span className="w-6 h-1.5 rounded-full bg-primary" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
        <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
      </div>

      {/* Copy */}
      <div className="px-8 text-center anim-fade-up delay-200">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Gifting for Everyone
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          From students to seniors, find the perfect voucher from 300+ top
          brands across shopping, food, fitness, travel and more.
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 pt-6">
        <button
          onClick={onSkip}
          className="text-base font-medium text-foreground/80"
        >
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
  );
};
