import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, ShieldCheck, ArrowUpRight, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSendOtp } from "@/hooks/useSendOtp";
import { useLoginWithOtp } from "@/hooks/useLoginWithOtp";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import gift360Logo from "@/assets/gift360full.png";
import bgImage from "@/assets/independence-bg.jpg";
import giftBox from "@/assets/gift-box.png";
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

// Independence Day campaign palette — kept as inline oklch() CSS values
// rather than Tailwind theme extensions, so this page doesn't require
// touching the shared tailwind.config used by the rest of the app.
const SAFFRON = "oklch(0.72 0.17 55)";
const INDIA_GREEN = "oklch(0.55 0.14 148)";
const NAVY = "oklch(0.32 0.09 265)";
const GRADIENT_TRICOLOR = `linear-gradient(90deg, ${SAFFRON}, oklch(0.99 0 0), ${INDIA_GREEN})`;
const GRADIENT_CTA = "linear-gradient(180deg, oklch(0.74 0.18 50), oklch(0.62 0.19 38))";
const SHADOW_CARD = "0 18px 40px -18px oklch(0.32 0.09 265 / 0.28)";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const isSessionExpired = searchParams.includes("session=expired");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const [otpSent, setOtpSent] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const sendOtpMutation = useSendOtp();
  const loginWithOtpMutation = useLoginWithOtp();
  const { setUser } = useAuthContext();
  const { toast } = useToast();

  useEffect(() => {
    if (isSessionExpired) {
      const t = setTimeout(() => window.history.replaceState({}, "", "/login"), 5000);
      return () => clearTimeout(t);
    }
  }, [isSessionExpired]);

  const CAMPAIGN_END = new Date("2026-08-17T23:59:59+05:30");
  const daysLeft = Math.max(
    1,
    Math.ceil((CAMPAIGN_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const validateMobile = (m: string) => /^[0-9]{10}$/.test(m);
  const validateOtp = (o: string[]) => o.every(d => d.length === 1);

  const handleOtpInput = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
    if (pasted.length > 0) {
      const newOtp = pasted.split("").concat(Array(4).fill("")).slice(0, 4);
      setOtp(newOtp);
      const nextEmpty = newOtp.findIndex(d => !d);
      otpRefs[nextEmpty === -1 ? 3 : nextEmpty].current?.focus();
    }
  };

  const handleSendOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(""); setOtpMsg(""); setOtpSent(false); setOtp(["", "", "", ""]);
    if (!mobile.trim()) { setMobileError("Mobile number is required"); return; }
    if (!validateMobile(mobile)) { setMobileError("Please enter a valid 10-digit mobile number"); return; }
    setMobileError("");
    sendOtpMutation.mutate({ mobileNumber: mobile, email: email.trim() }, {
      onSuccess: (data) => {
        if (data.notRegistered) { setError("Mobile number not registered. Please register first."); return; }
        if (data.success) {
          setOtpSent(true);
          setOtpMsg(data.message || "OTP sent successfully");
          toast({ title: "OTP sent", description: data.message || "OTP sent to your mobile", duration: 3000 });
        }
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message || err?.response?.data || "Failed to send OTP";
        setError(typeof msg === "string" ? msg : "Failed to send OTP");
      },
    });
  };

  const handleOtpLogin = (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    const otpStr = otp.join("");
    if (!validateMobile(mobile)) { setError("Please enter a valid mobile number"); return; }
    if (!validateOtp(otp)) { setError("Please enter a valid 4-digit OTP"); return; }
    loginWithOtpMutation.mutate({ mobileNumber: mobile.trim(), otp: otpStr, email: email.trim() }, {
      onSuccess: (data) => {
        if (data.token && data.userInfo) {
          setUser({
            name: data.userInfo.name, email: data.userInfo.email, mobile: data.userInfo.mobile,
            token: data.token, clientId: data.userInfo.clientId,
          });
          toast({ title: "Welcome back!", description: data.message || "Login successful", duration: 3000 });
          setTimeout(() => setLocation("/"), 400);
        } else { setError(data.message || "OTP login failed"); }
      },
      onError: (err: any) => {
        const d = err?.response?.data;
        const msg = typeof d === "string" ? d : d?.message || "OTP login failed. Please try again.";
        setError(msg);
      },
    });
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden font-sans" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <img
        src={bgImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top"
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-6 pt-5">
        {/* Brand row */}
        <header className="flex items-center justify-between">
          <img src={gift360Logo} alt="Gift360" className="w-[110px] h-auto object-contain" />
          <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 backdrop-blur bg-background/70" style={{ borderColor: `oklch(0.72 0.17 55 / 0.3)` }}>
            <span className="text-sm font-extrabold" style={{ color: SAFFRON }}>80</span>
            <span className="text-[9px] font-semibold leading-tight" style={{ color: NAVY }}>
              INDEPENDENCE
              <br />
              DAY OF INDIA
            </span>
          </div>
        </header>

        {/* Independence messaging */}
        <section className="mt-6 text-center">
          <h1 className="text-[34px] font-extrabold uppercase leading-[0.95] tracking-tight drop-shadow-sm" style={{ color: SAFFRON }}>
            India
            <span className="mt-0.5 block text-[26px]" style={{ color: INDIA_GREEN }}>Has Started Gifting</span>
          </h1>
          <p className="mt-2 text-[12px] font-medium" style={{ color: NAVY }}>
            Access 400+ brand vouchers. Delivered instantly, gifted joyfully.
          </p>
        </section>

        <div className="relative my-3 flex flex-1 items-center justify-center">
          <img
            src={giftBox}
            alt="Independence Day gift box"
            className="h-40 w-40 object-contain drop-shadow-xl"
          />
        </div>

        {/* Momentum strip */}
        <div className="mb-2 flex items-center justify-center">
          <span className="rounded-full border px-3 py-1 text-[12px] font-extrabold uppercase tracking-wide shadow-sm backdrop-blur bg-background/85" style={{ borderColor: `oklch(0.72 0.17 55 / 0.3)`, color: NAVY }}>
            The last {daysLeft} {daysLeft === 1 ? "day" : "days"} 🚀
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "10K+", label: "Registrations", color: SAFFRON },
            { value: "20K+", label: "Vouchers Bought", color: INDIA_GREEN },
            { value: "4.5K+", label: "Vouchers Gifted", color: NAVY },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border/70 bg-background/80 px-2 py-2 text-center shadow-sm backdrop-blur"
            >
              <p className="text-lg font-extrabold leading-none" style={{ color: s.color }}>
                {s.value}
              </p>
              <p className="mt-1 text-[9px] font-medium text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        <div
          className="mt-2 overflow-hidden rounded-full p-[1.5px]"
          style={{ background: GRADIENT_TRICOLOR }}
        >
          <p className="rounded-full bg-background/90 py-1.5 text-center text-[12px] font-extrabold uppercase tracking-wide backdrop-blur" style={{ color: INDIA_GREEN }}>
            Up to <span style={{ color: SAFFRON }}>20% cashback</span> earned
          </p>
        </div>

        {/* Login card */}
        <section className="mt-3 rounded-2xl border border-border bg-background/95 p-4 backdrop-blur" style={{ boxShadow: SHADOW_CARD }}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold" style={{ color: NAVY }}>Get Started</h2>
              <p className="text-[10px] text-muted-foreground">
                Enter your email &amp; mobile number to continue
              </p>
            </div>
            <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold" style={{ background: `oklch(0.72 0.17 55 / 0.12)`, color: SAFFRON }}>
              <Sparkles className="h-3 w-3" /> Till 17 Aug
            </span>
          </div>

          {isSessionExpired && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-50 p-2 text-[10px] font-medium text-amber-700">
              <AlertCircle size={14} className="shrink-0" />
              <span>Your session has expired. Please login again.</span>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-2 text-[10px] font-medium text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-2">
            <Input
              type="email"
              placeholder="Enter your email ID"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={otpSent}
              className="h-10 rounded-xl border border-input bg-background text-[12px] placeholder:text-muted-foreground disabled:opacity-60"
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center overflow-hidden rounded-xl border border-input bg-background">
              <div className="flex h-10 shrink-0 items-center gap-1 border-r border-border bg-muted px-2.5">
                <span className="text-[13px] leading-none">🇮🇳</span>
                <span className="text-[11px] font-semibold text-foreground">+91</span>
              </div>
              <Input
                type="tel"
                placeholder="Enter mobile number"
                value={mobile}
                maxLength={10}
                onChange={(e) => {
                  if (!/^[0-9]*$/.test(e.target.value)) return;
                  setMobile(e.target.value); setMobileError(""); setError("");
                }}
                disabled={otpSent}
                className="h-10 border-0 bg-transparent text-[12px] placeholder:text-muted-foreground disabled:opacity-60"
              />
            </div>
            {mobileError && <p className="text-red-500 text-[9px] mt-0.5 font-medium">{mobileError}</p>}
          </div>

          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={!validateMobile(mobile) || sendOtpMutation.isPending}
              style={{ background: GRADIENT_CTA }}
              className="mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
            >
              {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpInput(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="h-12 w-12 rounded-xl border border-input bg-background text-center text-xl font-bold text-foreground outline-none transition-colors"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleOtpLogin}
                disabled={!validateOtp(otp) || loginWithOtpMutation.isPending}
                style={{ background: GRADIENT_CTA }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-[12px] font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-50"
              >
                {loginWithOtpMutation.isPending ? "Verifying..." : "Verify & Continue"}
                {!loginWithOtpMutation.isPending && <ArrowUpRight className="h-4 w-4" />}
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Didn't receive?{" "}
                <button type="button" onClick={handleSendOtp} className="font-semibold underline" style={{ color: SAFFRON }}>
                  Resend OTP
                </button>
              </p>
            </div>
          )}

          {otpMsg && otpSent && <p className="text-emerald-600 text-[9px] mt-1 font-medium text-center">✓ {otpMsg}</p>}

          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3 w-3" style={{ color: INDIA_GREEN }} />
            <p className="text-[9px] font-medium text-muted-foreground">
              We'll send a secure OTP to verify your number
            </p>
          </div>
        </section>

        <p className="mt-3 text-center text-[11px] font-semibold" style={{ color: NAVY }}>
          Don't have an account?{" "}
          <Link href="/register">
            <button className="font-bold underline" style={{ color: SAFFRON }}>Sign up</button>
          </Link>
        </p>

        {/* Offer ribbon */}
        <div
          className="mt-3 overflow-hidden rounded-full p-[2px]"
          style={{ background: GRADIENT_TRICOLOR }}
        >
          <div className="rounded-full px-4 py-2 text-center" style={{ background: NAVY }}>
            <p className="text-[13px] font-extrabold uppercase tracking-wide text-primary-foreground">
              Offer live till 17 August
            </p>
            <p className="text-[9px] font-medium text-primary-foreground/75">
              Celebrate Freedom. Share the Joy. Gift More.
            </p>
          </div>
        </div>

        {/* Brand marquee */}
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <span className="whitespace-nowrap text-[9px] font-semibold tracking-wide" style={{ color: `${NAVY}` }}>
              TRUSTED BY 400+ BRANDS
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-2 w-full overflow-hidden">
            <div className="flex w-max anim-marquee-ltr" style={{ animationDuration: "20s" }}>
              {[...brandLogos, ...brandLogos].map((brand, i) => (
                <div key={i} className="flex items-center justify-center mx-2.5 shrink-0">
                  <img src={brand.src} alt={brand.name} className="h-[22px] w-auto object-contain opacity-70" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3 text-[9px] font-medium text-muted-foreground">
          <span>100% Safe &amp; Secure</span>
          <span className="h-3 w-px bg-border" />
          <span>Instant Delivery</span>
          <span className="h-3 w-px bg-border" />
          <span>400+ Brands</span>
        </div>

        <p className="mt-3 text-center text-[7px] text-muted-foreground px-4">
          By continuing, you agree to our{" "}
          <Link href="/terms"><button className="underline">Terms &amp; Conditions</button></Link>{" "}
          and{" "}
          <Link href="/privacy"><button className="underline">Privacy Policy</button></Link>
        </p>
      </div>
    </main>
  );
}
