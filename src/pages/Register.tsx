import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Mail, AlertCircle, CheckCircle, Smartphone, User, Sparkles, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRegisterSendOtp } from "@/hooks/useRegisterSendOtp";
import { useRegisterVerifyOtp } from "@/hooks/useRegisterVerifyOtp";
import { useAuthContext } from "@/contexts/AuthContext";
import { decodeJwtPayload } from "@/api/authApi";
import { FloatingCoins } from "@/components/FloatingCoins";
import gift360Logo from "@/assets/gift360full.png";

export default function Register() {
  const [, setLocation] = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const registerSendOtpMutation = useRegisterSendOtp();
  const registerVerifyOtpMutation = useRegisterVerifyOtp();
  const { setUser } = useAuthContext();
  const { toast } = useToast();

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const validateMobile = (m: string) => /^[0-9]{10}$/.test(m);
  const validateOtp = (o: string) => /^[0-9]{4,6}$/.test(o);

  const validateForm = () => {
    let valid = true;
    setError(""); setNameError(""); setEmailError(""); setMobileError("");
    if (!fullName.trim()) { setNameError("Full name is required"); valid = false; }
    if (!email.trim()) { setEmailError("Email is required"); valid = false; }
    else if (!validateEmail(email)) { setEmailError("Please enter a valid email"); valid = false; }
    if (!mobile.trim()) { setMobileError("Mobile number is required"); valid = false; }
    else if (!validateMobile(mobile)) { setMobileError("Please enter a valid 10-digit mobile number"); valid = false; }
    return valid;
  };

  const handleSendOtp = () => {
    if (!validateForm()) return;
    setOtp(""); setOtpSent(false);
    registerSendOtpMutation.mutate({ mobileNumber: mobile, email }, {
      onSuccess: (data) => {
        if (data.alreadyRegistered) {
          toast({ title: "Already registered", description: "This mobile is already registered. Please login.", variant: "destructive", duration: 4000 });
          setTimeout(() => setLocation("/login"), 2000); return;
        }
        if (data.success) { setOtpSent(true); toast({ title: "OTP Sent!", description: data.message || "OTP sent to your mobile", duration: 3000 }); }
      },
      onError: (err: any) => toast({ title: "Error", description: err.response?.data?.message || "Failed to send OTP", variant: "destructive" }),
    });
  };

  const handleVerifyOtp = () => {
    if (!validateOtp(otp)) { toast({ title: "Invalid OTP", description: "Please enter a valid 4-6 digit OTP", variant: "destructive" }); return; }
    if (!validateForm()) return;
    registerVerifyOtpMutation.mutate({ fullName, email, mobileNumber: mobile, otp }, {
      onSuccess: (data) => {
        if (data.success && data.token) {
          const payload = decodeJwtPayload(data.token);
          setUser({ name: fullName, email, mobile, token: data.token, clientId: payload.userId ?? "" });
          toast({ title: "Welcome to Gift360!", description: "Account created successfully", duration: 3000 });
          setTimeout(() => setLocation("/"), 400);
        }
      },
      onError: (err: any) => toast({ title: "Error", description: err.response?.data?.message || "Invalid OTP. Try again.", variant: "destructive" }),
    });
  };

  const inputBase = "h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/40 font-medium focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50";

  return (
    <div className="auth-page auth-page--register">
      {/* Scoped backdrop */}
      <div className="absolute inset-0">
        <FloatingCoins count={10} />
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(280,90%,60%,0.22), transparent 70%)" }} />
        <div className="absolute top-32 -right-16 w-80 h-80 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(220,90%,55%,0.18), transparent 70%)", animationDelay: "3s" }} />
        <div className="absolute bottom-20 left-1/4 w-56 h-56 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(48,95%,60%,0.14), transparent 70%)", animationDelay: "6s" }} />
        <div className="absolute inset-0 hero-grain opacity-30 pointer-events-none" />
      </div>

      <div className="auth-page__content relative z-10 flex flex-col px-5 pt-8 pb-8">
        {/* Branding */}
        <div className="flex flex-col items-center anim-fade-up">
          <div className="relative mb-3 g-float">
            <img src={gift360Logo} alt="Gift360" className="w-40 h-40 object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            <span className="text-black">Create Account</span>
          </h1>
          <p className="text-black text-sm mt-1 font-medium">Join Gift360 today</p>
        </div>

        {/* Premium purple card */}
        <div className="mt-6 anim-fade-up delay-200">
          <div className="relative rounded-3xl bg-[#5343B2] card-edge p-6 overflow-hidden">
            <div className="pointer-events-none absolute -top-12 -left-12 w-72 h-32 bg-gradient-to-r from-transparent via-white/10 to-transparent anim-hologram" />

            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h2 className="text-lg font-bold text-white">Sign Up</h2>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                  <Input placeholder="Enter your full name" value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setNameError(""); }}
                    disabled={otpSent} className={`pl-10 ${inputBase}`} />
                </div>
                {nameError && <p className="text-red-300 text-xs mt-1 font-medium">{nameError}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                  <Input type="email" placeholder="Enter your email" value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                    disabled={otpSent} className={`pl-10 ${inputBase}`} />
                </div>
                {emailError && <p className="text-red-300 text-xs mt-1 font-medium">{emailError}</p>}
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Mobile Number</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                    <span className="absolute left-9 top-1/2 -translate-y-1/2 text-white font-semibold text-sm pointer-events-none z-10">+91</span>
                    <Input type="tel" placeholder="10-digit number" value={mobile} maxLength={10}
                      onChange={(e) => { if (!/^[0-9]*$/.test(e.target.value)) return; setMobile(e.target.value); setMobileError(""); }}
                      disabled={otpSent} className={`pl-14 ${inputBase}`} />
                  </div>
                  <button type="button" onClick={handleSendOtp}
                    disabled={!validateMobile(mobile) || !validateEmail(email) || !fullName.trim() || registerSendOtpMutation.isPending || otpSent}
                    className={`h-12 px-4 rounded-2xl font-bold text-xs whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                      otpSent
                        ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200"
                        : "bg-gold-gradient text-amber-950 shadow-lg shadow-amber-500/30 hover:brightness-110"
                    }`}>
                    {registerSendOtpMutation.isPending ? "Sending..." : otpSent ? "✓ Sent" : "Send OTP"}
                  </button>
                </div>
                {mobileError && <p className="text-red-300 text-xs mt-1 font-medium">{mobileError}</p>}
                {otpSent && !mobileError && (
                  <p className="text-emerald-300 text-xs mt-1 font-medium flex items-center gap-1">
                    <CheckCircle size={12} />OTP sent successfully
                  </p>
                )}
              </div>

              {/* OTP */}
              {otpSent && (
                <div className="g-scale-in">
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Enter OTP</label>
                  <div className="flex gap-2">
                    <Input type="text" placeholder="• • • • • •" value={otp} maxLength={6}
                      onChange={(e) => { if (!/^[0-9]*$/.test(e.target.value)) return; setOtp(e.target.value); }}
                      className={`${inputBase} h-12 font-bold text-lg tracking-[0.4em] text-center placeholder:text-white/30`} />
                    <button type="button" onClick={handleVerifyOtp}
                      disabled={!validateOtp(otp) || registerVerifyOtpMutation.isPending}
                      className="h-12 px-4 rounded-2xl font-bold text-xs whitespace-nowrap bg-gold-gradient text-amber-950 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 inline-flex items-center gap-1">
                      {registerVerifyOtpMutation.isPending ? "Verifying..." : (<>Verify <ChevronRight className="h-4 w-4" /></>)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 text-center anim-fade-up delay-300">
          <p className="text-sm text-black font-medium">
            Already have an account?{" "}
            <Link href="/login"><button className="font-bold text-black hover:underline">Sign in</button></Link>
          </p>
          <p className="text-center text-[11px] text-black mt-4 font-medium px-6">
            By creating an account, you agree to our{" "}
            <Link href="/terms"><button className="text-black hover:text-black underline-offset-2">Terms</button></Link>
            {" "}and{" "}
            <Link href="/privacy"><button className="text-black hover:text-black underline-offset-2">Privacy Policy</button></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
