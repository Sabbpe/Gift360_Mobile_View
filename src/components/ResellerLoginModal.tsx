// components/ResellerLoginModal.tsx
// "Already a member? Login" — clientId + clientSecret login for resellers.
// POST /v1/reseller/auth/token exchanges credentials for a bearer token,
// saves the reseller session and starts the reseller flow (dashboard).
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { X, AlertCircle, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { requestResellerToken, saveResellerSession } from "@/api/resellerApi";

interface ResellerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResellerLoginModal({
  isOpen,
  onClose,
}: ResellerLoginModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = clientId.trim().length > 0 && clientSecret.trim().length > 0;

  const resetAndClose = () => {
    setClientId("");
    setClientSecret("");
    setShowSecret(false);
    setError("");
    setSubmitting(false);
    onClose();
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) {
      setError("Enter both Client ID and Client Secret");
      return;
    }
    setSubmitting(true);
    requestResellerToken(clientId.trim(), clientSecret.trim())
      .then((data) => {
        if (data.success && data.token) {
          saveResellerSession({
            token: data.token,
            resellerId: data.resellerId,
            clientId: clientId.trim(),
            walletBalance: data.walletBalance,
            savedAt: Date.now(),
          });
          toast({
            title: "Welcome back!",
            description: "Reseller login successful",
            duration: 3000,
          });
          onClose();
          setLocation("/reseller/dashboard");
        } else {
          setError("Login failed. Please check your credentials.");
        }
      })
      .catch((err) => {
        const d = (err as any)?.response?.data;
        const message =
          d?.message ||
          (typeof d === "string" ? d : null) ||
          "Invalid Client ID or Client Secret";
        setError(message);
      })
      .finally(() => setSubmitting(false));
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
            <h2 className="text-xl font-bold text-gray-900">Reseller Login</h2>
            <p className="text-xs text-gray-500">
              Already a member? Log in to your dashboard
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

        <form onSubmit={handleLogin} className="space-y-4 px-6 py-6 pb-8">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client ID */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Client ID
            </label>
            <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="e.g. testreseller"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setError("");
                }}
                className={inputClass}
              />
            </div>
          </div>

          {/* Client Secret */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">
              Client Secret
            </label>
            <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
              <input
                type={showSecret ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter your client secret"
                value={clientSecret}
                onChange={(e) => {
                  setClientSecret(e.target.value);
                  setError("");
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="px-3 text-gray-400 hover:text-gray-600"
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              Credentials are issued to your reseller account at onboarding.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 font-semibold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login to Dashboard"
            )}
          </button>

          {/* Secure note */}
          <div className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
            <p className="text-[11px] text-gray-500">
              Secured handshake — your secret is exchanged for a short-lived
              token
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
