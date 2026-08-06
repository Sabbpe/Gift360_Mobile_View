import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSendOtp } from "@/hooks/useSendOtp";
import { useLoginWithOtp } from "@/hooks/useLoginWithOtp";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import gift360Logo from "@/assets/gift360full.png";
import loginBg from "@/assets/LoginBackground.png";
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
    <div className="relative w-full h-screen overflow-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Background image */}
      <div
        className="absolute inset-0 w-full"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "cover",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-5 pt-6 pb-4">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img src={gift360Logo} alt="Gift360" className="w-[140px] h-auto object-contain" />
        </div>

        {/* Heading */}
        <div className="text-center mb-1">
          <h1 className="text-[17px] font-semibold text-black leading-tight">
            India #1 Destination for <span className="text-[#7C3AED]">Gifting</span>
          </h1>
          <p className="text-[10px] text-[#1E1E1E] mt-1 px-4">
            Access 400+ brands Vouchers. Delivered instantly, and gift feeling
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* White card */}
        <div className="w-full max-w-[342px] mx-auto bg-white rounded-[16px] border border-[#C9C9C9] shadow-[4px_4px_4px_rgba(0,0,0,0.25)] p-4 mb-2">
          <h2 className="text-[16px] font-semibold text-black mb-0.5">Get Started</h2>
          <p className="text-[9px] text-[#4E4E4E] mb-3">Enter your email & mobile number to continue</p>

          {isSessionExpired && (
            <div className="flex items-center gap-2 p-2 mb-3 rounded-xl border border-amber-300/30 bg-amber-50 text-amber-700 text-[10px] font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>Your session has expired. Please login again.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2 mb-3 rounded-xl border border-red-300 bg-red-50 text-red-600 text-[10px] font-medium">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email input */}
          <div className="mb-2">
            <Input
              type="email"
              placeholder="Enter your email ID"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              disabled={otpSent}
              className="h-9 rounded-[10px] border border-[#D9D9D9] bg-white text-black text-[11px] placeholder:text-[#A6A4A4] focus-visible:ring-[#7C3AED]/50 focus-visible:border-[#7C3AED]"
            />
          </div>

          {/* Mobile input */}
          <div className="mb-3">
            <div className="flex items-center rounded-[10px] border border-[#D9D9D9] bg-white overflow-hidden">
              <div className="flex items-center gap-1 px-2.5 h-9 bg-[#F7F7FA] border-r border-[#EBEBEB] shrink-0">
                <span className="text-[13px] leading-none">🇮🇳</span>
                <span className="text-[11px] font-medium text-black">+91</span>
                <svg className="w-2.5 h-2.5 text-[#A1A1A1]" viewBox="0 0 12 12" fill="none">
                  <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
                className="h-9 border-0 bg-transparent text-black text-[11px] placeholder:text-[#A6A4A4] focus-visible:ring-0 focus-visible:border-0"
              />
            </div>
            {mobileError && <p className="text-red-500 text-[9px] mt-0.5 font-medium">{mobileError}</p>}
          </div>

          {/* Send OTP / OTP verify */}
          {!otpSent ? (
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={!validateMobile(mobile) || sendOtpMutation.isPending}
              className="w-full h-9 rounded-[10px] font-semibold text-[11px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(180deg, #7B3DC3 0%, #5537BE 100%)",
                boxShadow: "2px 4px 8px rgba(183, 138, 243, 0.25)",
              }}
            >
              {sendOtpMutation.isPending ? "Sending..." : "Send OTP"}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke="white" strokeWidth="2"/>
                <path d="M12 7V17M12 7L8 11M12 7L16 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <div className="space-y-3">
              {/* 4-digit OTP boxes */}
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
                    className="w-[52px] h-[52px] rounded-[10px] border border-[#C9C9C9] bg-white text-center text-[20px] font-semibold text-black focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-colors"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleOtpLogin}
                disabled={!validateOtp(otp) || loginWithOtpMutation.isPending}
                className="w-full h-10 rounded-[10px] font-semibold text-[12px] text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(180deg, #7B3DC3 0%, #5537BE 100%)",
                  boxShadow: "2px 4px 8px rgba(183, 138, 243, 0.25)",
                }}
              >
                {loginWithOtpMutation.isPending ? "Verifying..." : "Verify"}
                {!loginWithOtpMutation.isPending && (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="11" stroke="white" strokeWidth="2"/>
                    <path d="M12 7V17M12 7L8 11M12 7L16 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <p className="text-center text-[10px] text-[#4E4E4E]">
                Didn't Receive?{" "}
                <button type="button" onClick={handleSendOtp} className="font-semibold text-[#7C3AED] underline">
                  Resend OTP
                </button>
              </p>
            </div>
          )}

          {otpMsg && otpSent && <p className="text-emerald-600 text-[9px] mt-1 font-medium text-center">✓ {otpMsg}</p>}

          {/* Secure note */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5">
            <ShieldCheck className="w-3 h-3 text-[#7C3AED]" />
            <p className="text-[8px] font-medium text-[#4E4E4E]">we'll send a secure OTP to verify your number</p>
          </div>
        </div>

        {/* TRUSTED BY 400+ BRANDS */}
        <div className="w-full max-w-[342px] mx-auto mb-1.5">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[#C9C9C9]" />
            <span className="text-[10px] font-medium text-[#35009A] whitespace-nowrap">TRUSTED BY 400+ BRANDS</span>
            <div className="flex-1 h-px bg-[#C9C9C9]" />
          </div>
        </div>

        {/* Brand logos marquee */}
        <div className="w-full overflow-hidden mb-2">
          <div className="flex w-max anim-marquee-ltr" style={{ animationDuration: "20s" }}>
            {[...brandLogos, ...brandLogos].map((brand, i) => (
              <div key={i} className="flex items-center justify-center mx-2.5 shrink-0">
                <img src={brand.src} alt={brand.name} className="h-[22px] w-auto object-contain opacity-70" />
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        <p className="text-center text-[7px] text-[#4E4E4E] px-4">
          By continuing, you agree to our{" "}
          <Link href="/terms"><button className="underline">Terms & Conditions</button></Link>{" "}
          and{" "}
          <Link href="/privacy"><button className="underline">Privacy Policy</button></Link>
        </p>
      </div>
    </div>
  );
}
