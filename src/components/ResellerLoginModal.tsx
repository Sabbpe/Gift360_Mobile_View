// components/ResellerLoginModal.tsx
// "Already a member? Login" — reseller login with contact_email + password.
// First login uses the unique initial password (V53, e.g. RSL-XXXXXXXX);
// POST /v1/reseller/auth/login stores the single-session JWT, and business
// calls later fetch credentials via POST /auth/jwt.
// Includes the forgot-password step: email -> link to /changepassword.
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { X, AlertCircle, ShieldCheck, Loader2, Eye, EyeOff, MailCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { resellerLogin, resellerForgotPassword } from "@/api/resellerApi";

interface ResellerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "login" | "forgot";

export default function ResellerLoginModal({
  isOpen,
  onClose,
}: ResellerLoginModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canLogin = email.trim().length > 0 && password.trim().length > 0;

  const resetAndClose = () => {
    setStep("login");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setForgotEmail("");
    setForgotSent(false);
    setError("");
    setBusy(false);
    onClose();
  };

  const errorMessage = (err: any, fallback: string): string => {
    const d = err?.response?.data;
    return (
      (typeof d === "string" ? d : d?.message) ||
      (err?.message && !String(err.message).startsWith("Request failed") ? err.message : "") ||
      fallback
    );
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canLogin) {
      setError("Enter your email and password");
      return;
    }
    setBusy(true);
    resellerLogin(email.trim(), password)
      .then((data) => {
        if (data.success && data.token) {
          toast({
            title: "Welcome back!",
            description: data.message || "Login successful",
            duration: 3000,
          });
          onClose();
          setLocation("/reseller/dashboard");
        } else {
          setError(data.message || "Login failed. Please try again.");
        }
      })
      .catch((err) => setError(errorMessage(err, "Login failed. Please try again.")))
      .finally(() => setBusy(false));
  };

  const handleForgot = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const mail = forgotEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    resellerForgotPassword(mail)
      .then(() => setForgotSent(true))
      .catch((err) => {
        const d = err?.response?.data;
        setError(
          (typeof d === "string" ? d : d?.message) ||
            "Couldn't send the reset link. Please retry."
        );
      })
      .finally(() => setBusy(false));
  };

  if (!isOpen) return null;

  const inputClass =
    "h-11 w-full bg-transparent px-3 text-sm outline-none placeholder:text-gray-400 disabled:bg-gray-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300"
        style={{ fontFamily: "Poppins, sans-serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 pt-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {step === "login" ? "Reseller Login" : "Forgot password"}
            </h2>
            <p className="text-xs text-gray-500">
              {step === "login"
                ? "Login with your email and password"
                : "We'll email a reset link to your registered email"}
            </p>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-full p-1 transition-colors hover:bg-gray-100"
            aria-label="Close login"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {step === "login" ? (
        <form onSubmit={handleLogin} className="space-y-4 px-6 py-6 pb-8">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Email
            </label>
            <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
              <input
                type="email"
                autoComplete="username"
                spellCheck={false}
                placeholder="registered@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className={inputClass}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Password
            </label>
            <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-start justify-between gap-2">
              <p className="text-[11px] text-gray-500">
                First time? Use the unique initial password shared with you.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("forgot");
                  setForgotEmail(email.trim());
                  setError("");
                }}
                className="shrink-0 text-[11px] font-semibold text-purple-600 underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy || !canLogin}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            <p className="text-[11px] text-gray-500">
              Single active session — a new login replaces the previous one
            </p>
          </div>
        </form>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4 px-6 py-6 pb-8">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {forgotSent ? (
              <div className="py-2 text-center">
                <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
                  <MailCheck className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="text-sm font-bold text-gray-900">Check your email</p>
                <p className="mt-1 text-xs text-gray-500">
                  If <span className="font-semibold">{forgotEmail.trim()}</span> is
                  registered, a reset link is on its way. The link is valid for
                  30 minutes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setForgotSent(false);
                    setError("");
                  }}
                  className="mt-4 rounded-full bg-purple-50 px-5 py-2 text-xs font-semibold text-purple-700 transition-all active:scale-95"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Registered email
                  </label>
                  <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
                    <input
                      type="email"
                      autoComplete="username"
                      spellCheck={false}
                      placeholder="registered@email.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setError("");
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy || !forgotEmail.trim()}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setError("");
                  }}
                  className="w-full rounded-full bg-gray-100 px-5 py-2.5 text-xs font-semibold text-gray-600 transition-all active:scale-95"
                >
                  Back to login
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
