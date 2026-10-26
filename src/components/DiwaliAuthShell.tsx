import type { ReactNode } from "react";
import { Link } from "wouter";
import { ShieldCheck, Sparkles } from "lucide-react";
import gift360Logo from "@/assets/gift360full.png";
import diwaliBg from "@/assets/diwali-bg.jpg";
import diwaliGift from "@/assets/diwali-gift.png";
import amazon from "@/assets/amazon.png";
import flipkart from "@/assets/flipkart.png";
import myntra from "@/assets/myntra.png";
import nike from "@/assets/nike.png";
import puma from "@/assets/puma.png";
import bata from "@/assets/bata.png";
import levis from "@/assets/levis.png";
import tatacliq from "@/assets/tatacliq.png";
import ajio from "@/assets/ajio.png";
import zomato from "@/assets/zomato.png";

const brandLogos = [
  { src: amazon, name: "Amazon" },
  { src: flipkart, name: "Flipkart" },
  { src: myntra, name: "Myntra" },
  { src: nike, name: "Nike" },
  { src: puma, name: "Puma" },
  { src: bata, name: "Bata" },
  { src: levis, name: "Levi's" },
  { src: tatacliq, name: "TataCliQ" },
  { src: ajio, name: "AJIO" },
  { src: zomato, name: "Zomato" },
];

const stats = [
  { value: "25K+", label: "Bought & Gifted", tone: "text-[#D4650F]" },
  { value: "20%", label: "Upto Cashback", tone: "text-[#B5246F]" },
  { value: "400+", label: "Brands", tone: "text-[#3F1A55]" },
];


type Props = {
  /** Card heading, e.g. "Get Started" */
  title: string;
  /** Small line under the heading */
  subtitle?: string;
  /** "Don't have an account? Sign up" / "Already have an account? Sign in" */
  switchPrompt: ReactNode;
  /** Card body: alerts, inputs, buttons */
  children: ReactNode;
};

/**
 * Shared Diwali look for /login and /register.
 * Only presentation lives here; all auth logic stays in the pages.
 */
export default function DiwaliAuthShell({ switchPrompt, children }: Props) {
  return (
    <div
      className="relative h-[100dvh] w-full overflow-y-auto overflow-x-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      <img
        src={diwaliBg}
        alt=""
        aria-hidden="true"
        width={1024}
        height={1792}
        decoding="async"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover object-top"
      />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col px-5 pb-3 pt-3">
        {/* Brand row: logo centred, Diwali badge on the right */}
        <header className="relative flex items-center justify-center">
          {/* fixed-height slot: any empty padding inside the PNG overflows harmlessly */}
          <div className="relative h-[64px] w-full">
            {/* soft glow instead of a hard pill so the gold logo lifts off the background */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[110px] w-[300px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,252,240,0.95)_0%,rgba(255,248,225,0.7)_40%,rgba(255,248,225,0)_70%)]" />
            <img
              decoding="async"
              src={gift360Logo}
              alt="Gift360"
              className="absolute left-1/2 top-1/2 h-auto w-[230px] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)]"
            />
          </div>
          <div className="absolute right-0 top-1/2 hidden min-[420px]:flex -translate-y-1/2 items-center gap-1 rounded-full border border-[#D4650F]/30 bg-white/70 px-2 py-0.5 backdrop-blur">
            <span className="text-[12px] leading-none">🪔</span>
            <span className="text-[8px] font-semibold leading-tight text-[#3F1A55]">
              HAPPY
              <br />
              DIWALI
            </span>
          </div>
        </header>

        {/* Headline */}
        <section className="mt-2 text-center">
          <h1 className="text-[28px] font-extrabold uppercase leading-[0.95] tracking-tight text-[#D4650F] drop-shadow-sm">
            Guaranteed Savings
            <span className="mt-0.5 block text-[22px] text-[#B5246F]">On Your Daily Purchases</span>
          </h1>
          <p className="mt-1 text-[11px] font-medium text-[#3F1A55]/80">
            Upto 20% cashback + SuperCoins on 400+ brands
          </p>
        </section>

        {/* Gift box: takes whatever height is left, so the whole page fits one screen */}
        <div className="relative my-1 min-h-[110px] flex-1">
          <img
            src={diwaliGift}
            decoding="async"
            alt="Diwali gift box bursting with gift vouchers from top brands"
            width={596}
            height={620}
            className="anim-float absolute inset-0 h-full w-full object-contain drop-shadow-xl"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-black/5 bg-white/80 px-2 py-1.5 text-center shadow-sm backdrop-blur"
            >
              <p className={`text-base font-extrabold leading-none ${s.tone}`}>{s.value}</p>
              <p className="mt-0.5 text-[9px] font-medium text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Auth card */}
        <section className="mx-auto mt-2 w-full max-w-[342px] rounded-2xl border border-[#E5E0D8] bg-white/95 p-3 shadow-[0_18px_40px_-18px_rgba(63,26,85,0.35)] backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold leading-tight text-[#3F1A55]">Get Started</h2>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#D4650F]/10 px-2 py-1 text-[9px] font-semibold text-[#D4650F]">
              <Sparkles className="h-3 w-3" /> Diwali
            </span>
          </div>

          {children}

          <div className="mt-2 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-[#B5246F]" />
            <p className="text-[10px] font-medium text-[#4E4E4E]">we'll send a secure OTP to verify your number</p>
          </div>
        </section>

        {/* Switch login / register */}
        <div className="mx-auto mt-2 w-full max-w-[342px] text-center">
          <p className="inline-block rounded-full border border-[#8F6A10]/30 bg-white/90 px-4 py-1 text-[12px] font-semibold text-[#3F1A55] shadow-sm">
            {switchPrompt}
          </p>
        </div>

        {/* Trusted by */}
        <div className="mt-2 rounded-2xl border border-[#8F6A10]/25 bg-white/85 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-[#C9C9C9]" />
            <span className="whitespace-nowrap text-[9px] font-semibold tracking-wide text-[#3F1A55]/70">
              TRUSTED BY 400+ BRANDS
            </span>
            <span className="h-px flex-1 bg-[#C9C9C9]" />
          </div>
          <div className="mt-1.5 overflow-hidden">
            <div className="anim-marquee-ltr flex w-max" style={{ animationDuration: "20s" }}>
              {[...brandLogos, ...brandLogos].map((brand, i) => (
                <div key={i} className="mx-2.5 flex shrink-0 items-center justify-center">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={brand.src}
                    alt={brand.name}
                    className="h-[20px] w-auto object-contain opacity-80"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Terms */}
        <p className="mt-2 rounded-full bg-white/85 px-3 py-1 text-center text-[9px] font-medium text-[#4E4E4E] backdrop-blur">
          By continuing, you agree to our{" "}
          <Link href="/terms">
            <button className="underline">Terms & Conditions</button>
          </Link>{" "}
          and{" "}
          <Link href="/privacy">
            <button className="underline">Privacy Policy</button>
          </Link>
        </p>
      </div>
    </div>
  );
}
