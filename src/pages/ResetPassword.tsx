import { useState, useEffect } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, KeyRound, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useResetPassword } from "@/hooks/useResetPassword";
import { useValidateResetToken } from "@/hooks/useValidateResetToken";
import { FloatingCoins } from "@/components/FloatingCoins";
import axios from "axios";

type TokenStatus = "loading" | "valid" | "invalid" | "expired" | "used";

function AuroraShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-hero-aurora">
        <FloatingCoins count={8} />
        <div className="absolute -top-10 -left-10 w-72 h-72 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(280,90%,60%,0.55), transparent 70%)" }} />
        <div className="absolute top-32 -right-16 w-80 h-80 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(220,90%,55%,0.5), transparent 70%)", animationDelay: "3s" }} />
        <div className="absolute bottom-20 left-1/4 w-56 h-56 rounded-full blur-3xl anim-aurora"
          style={{ background: "radial-gradient(circle, hsla(48,95%,60%,0.32), transparent 70%)", animationDelay: "6s" }} />
        <div className="absolute inset-0 hero-grain opacity-50 pointer-events-none" />
      </div>
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();

  const token = new URLSearchParams(searchParams).get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("loading");
  const [success, setSuccess] = useState(false);

  const validateTokenMutation = useValidateResetToken();
  const resetPasswordMutation = useResetPassword();

  useEffect(() => {
    if (!token) { setTokenStatus("invalid"); return; }
    validateTokenMutation.mutate({ token }, {
      onSuccess: (data) => {
        if (data.status === "VALID") setTokenStatus("valid");
        else if (data.status === "EXPIRED") setTokenStatus("expired");
        else if (data.status === "ALREADY_USED") setTokenStatus("used");
        else setTokenStatus("invalid");
      },
      onError: () => setTokenStatus("invalid"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validatePassword = (p: string): string => {
    if (p.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter";
    if (!/[0-9]/.test(p)) return "Password must contain at least one number";
    return "";
  };

  const handlePasswordChange = (v: string) => {
    setNewPassword(v); setError("");
    setPasswordError(validatePassword(v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newPassword) { setError("Password is required"); return; }
    const v = validatePassword(newPassword);
    if (v) { setError(v); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }

    resetPasswordMutation.mutate({ token, newPassword }, {
      onSuccess: (data) => {
        if (data.success) {
          setSuccess(true);
          toast({ title: "Password Reset Successful", description: "You can now login with your new password", duration: 5000 });
          setTimeout(() => setLocation("/login"), 3000);
        } else setError(data.message);
      },
      onError: (err) => {
        if (axios.isAxiosError(err)) setError(err.response?.data?.message || "Failed to reset password. Please try again.");
        else setError("Failed to reset password. Please try again.");
      },
    });
  };

  const isLoading = resetPasswordMutation.isPending;
  const inputBase = "h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/40 font-medium focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50";

  if (tokenStatus === "loading") {
    return (
      <AuroraShell>
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin text-amber-300 mx-auto mb-4" />
          <p className="text-white/70 font-medium">Validating reset link...</p>
        </div>
      </AuroraShell>
    );
  }

  if (tokenStatus !== "valid") {
    let title = "Invalid Reset Link";
    let message = "This password reset link is invalid or has expired.";
    if (tokenStatus === "expired") { title = "Link Expired"; message = "This password reset link has expired. Please request a new one."; }
    else if (tokenStatus === "used") { title = "Link Already Used"; message = "This password reset link has already been used. Please request a new one if you need to reset your password again."; }

    return (
      <AuroraShell>
        <div className="anim-fade-up">
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
              <div className="relative w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center g-float">
                <KeyRound size={36} className="text-amber-300" />
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-blackcard card-edge p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/15 border border-red-400/30 mb-2">
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
              <p className="text-white/70 text-sm">{message}</p>
              <div className="pt-4 space-y-3">
                <Link href="/forgot-password">
                  <button className="w-full h-12 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all">
                    Request New Reset Link
                  </button>
                </Link>
                <Link href="/login">
                  <button className="w-full h-12 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10 active:scale-95 transition-all">
                    Back to Login
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AuroraShell>
    );
  }

  if (success) {
    return (
      <AuroraShell>
        <div className="anim-fade-up">
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
              <div className="relative w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center g-float">
                <CheckCircle2 size={36} className="text-amber-300" />
              </div>
            </div>
          </div>
          <div className="rounded-3xl bg-blackcard card-edge p-6">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-300" />
              </div>
              <h3 className="text-xl font-bold text-white">Password Reset Successfully!</h3>
              <p className="text-white/70 text-sm">Your password has been updated. Redirecting you to login...</p>
            </div>
          </div>
        </div>
      </AuroraShell>
    );
  }

  return (
    <AuroraShell>
      <div className="text-center mb-6 anim-fade-up">
        <div className="relative inline-block mb-4">
          <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
          <div className="relative w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center g-float">
            <KeyRound size={36} className="text-amber-300" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="text-gold-gradient">Reset Your Password</span>
        </h1>
        <p className="text-white/70 text-sm mt-1.5 font-medium">Enter your new password below</p>
      </div>

      <div className="anim-fade-up delay-200">
        <div className="relative rounded-3xl bg-blackcard card-edge p-6 overflow-hidden">
          <div className="pointer-events-none absolute -top-12 -left-12 w-72 h-32 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent anim-hologram" />

          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <h2 className="text-lg font-bold text-white">New Password</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-medium">
                <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                <Input type={showPassword ? "text" : "password"} placeholder="Enter new password"
                  value={newPassword} onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={isLoading} className={`pl-10 pr-10 ${inputBase}`} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-amber-300 z-10">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-red-300 text-xs mt-1.5 font-medium">{passwordError}</p>}
              <p className="text-[11px] text-white/50 mt-1.5">
                Must be at least 8 characters with uppercase, lowercase, and numbers
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                <Input type={showConfirmPassword ? "text" : "password"} placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  disabled={isLoading} className={`pl-10 pr-10 ${inputBase}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-amber-300 z-10">
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit"
              disabled={isLoading || !!passwordError || !newPassword || !confirmPassword}
              className="w-full h-12 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100">
              {isLoading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/login">
              <button type="button" className="text-sm font-semibold text-amber-200 hover:text-amber-100 transition-colors">
                Back to Login
              </button>
            </Link>
          </div>
        </div>
      </div>
    </AuroraShell>
  );
}
