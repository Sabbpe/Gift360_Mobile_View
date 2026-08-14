// src/pages/Admin/AdminLogin.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyAdminKey, ADMIN_KEY_STORAGE } from "@/api/adminApi";

export default function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError("");
    const valid = await verifyAdminKey(key.trim());
    setLoading(false);
    if (valid) {
      sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
      onSuccess();
    } else {
      setError("Invalid admin key.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 space-y-4"
      >
        <h1 className="text-xl font-bold text-center text-[#111827]">
          Gift360 Admin
        </h1>
        <p className="text-sm text-[#6B7280] text-center">
          Enter the admin key to continue.
        </p>
        <Input
          type="password"
          placeholder="Admin key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoFocus
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Checking..." : "Enter"}
        </Button>
      </form>
    </div>
  );
}
