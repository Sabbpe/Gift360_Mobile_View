import { useState } from "react";
import { Link } from "wouter";
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, KeyRound, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForgotPassword } from "@/hooks/useForgotPassword";
import { FloatingCoins } from "@/components/FloatingCoins";
import axios from "axios";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const forgotPasswordMutation = useForgotPassword();
  const isLoading = forgotPasswordMutation.isPending;

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Email address is required"); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); return; }

    forgotPasswordMutation.mutate({ email }, {
      onSuccess: (data) => {
        setSuccess(true);
        toast({ title: "Success!", description: data.message || "Password reset link sent to your email", duration: 5000 });
      },
      onError: (err) => {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const message = err.response?.data?.message;
          if (status === 429) setError(message || "You can only reset your password once every 24 hours. Please try again later.");
          else if (status === 404) setError("Email address not found");
          else setError(message || "Failed to send reset link");
        } else setError("Network error. Please check your connection and try again.");
      },
    });
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center p-5">
      {/* Aurora */}
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

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-7 anim-fade-up">
          <div className="relative inline-block mb-4">
            <span className="absolute -inset-[3px] rounded-3xl bg-gold-gradient blur-[2px] opacity-80" />
            <div className="relative w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center g-float">
              <KeyRound size={36} className="text-amber-300" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="text-gold-gradient">Forgot Password?</span>
          </h1>
          <p className="text-white/70 text-sm mt-1.5 font-medium">
            No worries — we'll send you reset instructions
          </p>
        </div>

        <div className="anim-fade-up delay-200">
          <div className="relative rounded-3xl bg-blackcard card-edge p-6 overflow-hidden">
            <div className="pointer-events-none absolute -top-12 -left-12 w-72 h-32 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent anim-hologram" />

            {success ? (
              <div className="text-center space-y-4 g-scale-in">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 mb-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                </div>
                <h3 className="text-xl font-bold text-white">Check Your Email</h3>
                <p className="text-white/70 text-sm">
                  We've sent a password reset link to <strong className="text-amber-200">{email}</strong>
                </p>
                <p className="text-xs text-white/50">
                  The link will expire in 30 minutes for security reasons
                </p>
                <Link href="/login">
                  <button className="w-full h-12 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center justify-center gap-2 mt-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Login
                  </button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <h2 className="text-lg font-bold text-white">Reset Your Password</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl border border-red-400/30 bg-red-500/10 text-red-200 text-xs font-medium">
                      <AlertCircle size={16} className="shrink-0" /><span>{error}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-300/80 z-10" />
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                        disabled={isLoading}
                        className="pl-10 h-12 rounded-2xl bg-white/5 border-white/15 text-white placeholder:text-white/40 font-medium focus-visible:ring-amber-300/50 focus-visible:border-amber-300/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-2xl bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <Link href="/login">
                    <button className="inline-flex items-center text-sm font-semibold text-amber-200 hover:text-amber-100 transition-colors">
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back to Login
                    </button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/50 mt-6 font-medium">
          Didn't receive the email? Check your spam folder
        </p>
      </div>
    </div>
  );
}
