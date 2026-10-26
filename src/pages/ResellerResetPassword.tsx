// pages/ResellerResetPassword.tsx
// Target of the forgot-password email link: /changepassword?token=...
// Enter + re-enter the new password (must match) -> POST /auth/reset-password
// -> bcrypt-saved for future logins; the active session is invalidated.
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowLeft, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { resellerResetPassword } from "@/api/resellerApi";

export default function ResellerResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const mismatch = password.length > 0 && confirm.length > 0 && password !== confirm;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match — enter the same password in both fields");
      return;
    }
    setBusy(true);
    resellerResetPassword(token, password)
      .then((data) => {
        if (data.success) {
          setDone(true);
        } else {
          setError(data.message || "Couldn't reset the password. Please retry.");
        }
      })
      .catch((err) => {
        const d = err?.response?.data;
        setError(
          (typeof d === "string" ? d : d?.message) ||
            "This reset link is invalid or has expired."
        );
      })
      .finally(() => setBusy(false));
  };

  const inputClass =
    "h-11 w-full bg-transparent px-3 text-sm outline-none placeholder:text-gray-400";

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <nav className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            onClick={() => setLocation("/reseller")}
            className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">Change password</h1>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          {!token ? (
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-red-50">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">
                Missing reset link
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Open the link from your email, or request a new one from the
                login screen.
              </p>
              <button
                onClick={() => setLocation("/reseller")}
                className="mt-4 rounded-full bg-purple-50 px-5 py-2 text-xs font-semibold text-purple-700 active:scale-95"
              >
                Back to Reseller
              </button>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">
                Password updated
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Your new password is saved — use it for your next login. Your
                previous session was signed out.
              </p>
              <button
                onClick={() => setLocation("/reseller")}
                className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-2.5 text-xs font-bold text-white shadow active:scale-95"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-purple-50">
                  <KeyRound className="h-5 w-5 text-purple-600" />
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Enter new password
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Minimum 6 characters — both fields must match
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Enter new password
                </label>
                <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="px-3 text-gray-400 hover:text-gray-600"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Re-enter new password
                </label>
                <div className="flex h-11 items-center rounded-xl border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-purple-500">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter the new password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      setError("");
                    }}
                    className={inputClass}
                  />
                </div>
                {mismatch && (
                  <p className="mt-1 text-[11px] font-medium text-red-500">
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !token || !password || !confirm || mismatch}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 font-semibold text-white shadow-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Set new password"
                )}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
