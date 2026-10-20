// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AuthUser } from "@/types/auth";
import { useLocation } from "wouter";
import { SessionExpiredDialog } from "@/components/SessionExpiredDialog";

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * True only when the JWT's exp claim is readable AND already in the past.
 * If the token can't be decoded we return false (not expired) and let the server decide.
 */
const isTokenExpired = (token?: string | null): boolean => {
  if (!token) return false;
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" && exp * 1000 <= Date.now();
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const savedUser = localStorage.getItem("authUser");
      const parsed: AuthUser | null = savedUser ? JSON.parse(savedUser) : null;
      // Don't show a stale browser as logged in once its token has already expired.
      if (parsed && isTokenExpired(parsed.token)) {
        localStorage.removeItem("authUser");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [showExpiredDialog, setShowExpiredDialog] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      localStorage.setItem("authUser", JSON.stringify(user));
    } else {
      localStorage.removeItem("authUser");
    }
  }, [user]);

  // Listen for token expiry from axios interceptor
  useEffect(() => {
    const handleTokenExpired = () => {
      const currentPath = window.location.pathname || "";
      const isPaymentResultPage = currentPath.includes("/payment-result");

      // Never force session-expired dialog on payment result page.
      // Payment callback result should remain visible even on 401 from background calls.
      if (isPaymentResultPage) {
        console.warn("auth:expired ignored on payment-result page");
        return;
      }

      // Clear cart merge flag on token expiry
      if (user?.clientId) {
        localStorage.removeItem(`cart_merged_${user.clientId}`);
      }
      setUser(null);
      setShowExpiredDialog(true);
    };

    window.addEventListener("auth:expired", handleTokenExpired);
    return () => window.removeEventListener("auth:expired", handleTokenExpired);
  }, [user]);

  // When a stale tab comes back to the foreground, check expiry right away instead of
  // waiting for a failed API call (which previously left the UI looking logged in).
  useEffect(() => {
    const checkOnReturn = () => {
      if (document.visibilityState === "hidden") return;
      if (user && isTokenExpired(user.token)) {
        window.dispatchEvent(new Event("auth:expired"));
      }
    };
    document.addEventListener("visibilitychange", checkOnReturn);
    window.addEventListener("focus", checkOnReturn);
    return () => {
      document.removeEventListener("visibilitychange", checkOnReturn);
      window.removeEventListener("focus", checkOnReturn);
    };
  }, [user]);

  const handleLoginRedirect = () => {
    setShowExpiredDialog(false);
    setLocation("/login?session=expired"); // ✅ Pass expired flag
  };

  const logout = () => {
      // Clear cart merge flag before logging out
  if (user?.clientId) {
    localStorage.removeItem(`cart_merged_${user.clientId}`);
  }
    setUser(null);
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated: !!user,
        logout,
      }}
    >
      {children}
      <SessionExpiredDialog
        open={showExpiredDialog}
        onLoginRedirect={handleLoginRedirect}
      />
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};
