import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertCircle, Smartphone, Gift, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSendOtp } from "@/hooks/useSendOtp";
import { useLoginWithOtp } from "@/hooks/useLoginWithOtp";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FloatingCoins } from "@/components/FloatingCoins";

export default function Login() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const isSessionExpired = searchParams.includes("session=expired");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otp, setOtp] = useState("");
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
  const validateOtp = (o: string) => /^[0-9]{4,6}$/.test(o);

  const handleSendOtp = (e: React.MouseEvent) => {
    e.preventDefault();
    setError(""); setOtpMsg(""); setOtpSent(false); setOtp("");
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
    if (!validateMobile(mobile)) { setError("Please enter a valid mobile number"); return; }
    if (!validateOtp(otp)) { setError("Please enter a valid 4-6 digit OTP"); return; }
    loginWithOtpMutation.mutate({ mobileNumber: mobile.trim(), otp, email: email.trim() }, {
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
    <div className="auth-page auth-page--login">
      {/* ── Purple backdrop (matches Home header) ── */}
      <div className="absolute inset-0">
        <FloatingCoins count={10} />
        <div
          className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, #523da9, transparent 70%)" }}
        />
        <div
          className="absolute top-32 -right-16 w-80 h-80 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, #4c42b8, transparent 70%)", animationDelay: "3s" }}
        />
        <div
          className="absolute bottom-20 left-1/4 w-56 h-56 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, #5365df, transparent 70%)", animationDelay: "6s" }}
        />
        <div className="absolute inset-0 hero-grain opacity-30 pointer-events-none" />
      </div>

      <div className="auth-page__content relative z-10 flex flex-col px-5 pt-10 pb-8">
        {/* ── Branding ── */}
        <div className="flex flex-col items-center anim-fade-up">
          <div className="relative mb-4">
            <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
            <div className="relative w-20 h-20 rounded-3xl bg-[#5343B2] card-edge flex items-center justify-center g-float">
              <Gift size={40} className="text-amber-300" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-black">
              {isSessionExpired ? "Session Expired" : "Welcome Back"}
            </span>
          </h1>
          <p className="text-black text-sm mt-1.5 font-medium">
            {isSessionExpired ? "Please login to continue" : "Sign in to Gift360"}
          </p>
        </div>

        {/* ── Premium purple card ── */}
        <div className="mt-8 anim-fade-up delay-200">
          <div className="relative rounded-3xl bg-[#5343B2] card-edge p-6 overflow-hidden">
            {/* hologram sheen */}
            <div className="pointer-events-none absolute -top-12 -left-12 w-72 h-32 bg-gradient-to-r from-transparent via-white/10 to-transparent anim-hologram" />

            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h2 className="text-lg font-bold text-white">Sign In</h2>
            </div>

            {isSessionExpired && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-200 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>Your session has expired. Please login again.</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  disabled={otpSent}
                  className="h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/40 font-medium focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50"
                />
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                  Mobile Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-300/80 z-10" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-white font-semibold text-sm pointer-events-none z-10">
                      +91
                    </span>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile"
                      value={mobile}
                      maxLength={10}
                      onChange={(e) => {
                        if (!/^[0-9]*$/.test(e.target.value)) return;
                        setMobile(e.target.value); setMobileError(""); setError("");
                      }}
                      disabled={otpSent}
                      className="pl-16 h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/40 font-medium focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={!validateMobile(mobile) || sendOtpMutation.isPending || otpSent}
                    className={`h-12 px-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
                      otpSent
                        ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-200"
                        : "bg-gold-gradient text-amber-950 shadow-lg shadow-amber-500/30 hover:brightness-110"
                    }`}
                  >
                    {sendOtpMutation.isPending ? "Sending..." : otpSent ? "✓ Sent" : "Send OTP"}
                  </button>
                </div>
                {mobileError && <p className="text-red-300 text-xs mt-1.5 font-medium">{mobileError}</p>}
                {otpMsg && otpSent && <p className="text-emerald-300 text-xs mt-1.5 font-medium">✓ {otpMsg}</p>}
              </div>

              {/* OTP */}
              {otpSent && (
                <div className="g-scale-in">
                  <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                    Enter OTP
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="• • • • • •"
                      value={otp}
                      maxLength={6}
                      onChange={(e) => {
                        if (!/^[0-9]*$/.test(e.target.value)) return;
                        setOtp(e.target.value); setError("");
                      }}
                      className="h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/30 font-bold text-lg tracking-[0.4em] text-center focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50"
                    />
                    <button
                      type="button"
                      onClick={handleOtpLogin}
                      disabled={!validateOtp(otp) || loginWithOtpMutation.isPending}
                      className="h-12 px-4 rounded-2xl font-bold text-sm whitespace-nowrap bg-gold-gradient text-amber-950 shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 inline-flex items-center gap-1"
                    >
                      {loginWithOtpMutation.isPending ? "Verifying..." : (<>Verify <ChevronRight className="h-4 w-4" /></>)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer links ── */}
        <div className="mt-auto pt-8 text-center anim-fade-up delay-300">
          <p className="text-sm text-black font-medium">
            Don't have an account?{" "}
            <Link href="/register">
              <button className="font-bold text-black hover:underline">Sign up</button>
            </Link>
          </p>
          <p className="text-center text-[11px] text-black mt-5 font-medium px-6">
            By continuing, you agree to our{" "}
            <Link href="/terms"><button className="text-black hover:text-black underline-offset-2">Terms</button></Link>{" "}
            and{" "}
            <Link href="/privacy"><button className="text-black hover:text-black underline-offset-2">Privacy Policy</button></Link>
          </p>
        </div>
      </div>
    </div>
  );
}
