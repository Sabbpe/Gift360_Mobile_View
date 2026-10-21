import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import FeedbackForm, { hasSubmittedFeedback } from "@/components/FeedbackForm";
import { getFeedbackStatus } from "@/api/feedbackApi";
import { useAuthContext } from "@/contexts/AuthContext";

// Post-login prompting was replaced by the contextual MicroQuestionWidget
// (right-edge Yes/No questions). The full feedback form is still requested
// for voucher-fetched / payment-pending, and manually via the header icon.
export type FeedbackTrigger = "voucher-fetched" | "payment-pending";

/** Any page can ask the orchestrator to consider showing the feedback form. */
export function promptFeedback(trigger: FeedbackTrigger): void {
  window.dispatchEvent(new CustomEvent("feedback:prompt", { detail: { trigger } }));
}

const COOLDOWN_KEY = "gift360_fb_trigger_last";
const TRIGGER_COOLDOWNS: Record<FeedbackTrigger, number> = {
  "voucher-fetched": 24 * 60 * 60_000,
  "payment-pending": 2 * 60 * 60_000,
};
// Never pop the form on pages where a survey would be noise.
const BLOCKED_PATHS = [
  "/admin", "/onboarding", "/login", "/register",
  "/forgot-password", "/reset-password",
];

function readCooldowns(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(COOLDOWN_KEY) || "{}") ?? {};
  } catch {
    return {};
  }
}

function inCooldown(trigger: FeedbackTrigger): boolean {
  const last = readCooldowns()[trigger] ?? 0;
  return Date.now() - last < TRIGGER_COOLDOWNS[trigger];
}

function stampTrigger(trigger: FeedbackTrigger): void {
  try {
    const all = readCooldowns();
    all[trigger] = Date.now();
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

function clearCooldown(trigger: FeedbackTrigger): void {
  try {
    const all = readCooldowns();
    delete all[trigger];
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

/**
 * Global owner of the auto feedback form prompt (voucher-fetched and
 * payment-pending only). Whether the customer already submitted is decided
 * by the backend (`GET /v1/feedback/status`), not localStorage.
 */
export default function FeedbackOrchestrator() {
  const { user } = useAuthContext();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  // null = not yet known (status check pending); true/false once resolved.
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const prevUserClientIdRef = useRef<string | undefined>(user?.clientId);
  const openRef = useRef(false);
  const submittedRef = useRef<boolean | null>(null);
  openRef.current = open;
  submittedRef.current = submitted;

  const pathBlocked = BLOCKED_PATHS.some(
    (p) => location === p || location.startsWith(p + "/")
  );

  const tryShow = useCallback(
    (trigger: FeedbackTrigger) => {
      if (openRef.current) return;
      // Only prompt once the backend has confirmed this customer never submitted.
      if (submittedRef.current !== false) return;
      if (pathBlocked) return;
      if (inCooldown(trigger)) return;
      stampTrigger(trigger);
      setOpen(true);
    },
    [pathBlocked]
  );

  // Backend-side "has this customer ever submitted" — source of truth.
  // localStorage is only a stale-cache fallback when the status call fails.
  const refreshSubmitted = useCallback(async (clientId: string) => {
    try {
      const res = await getFeedbackStatus(clientId);
      setSubmitted(!!res.submitted);
    } catch {
      setSubmitted(hasSubmittedFeedback());
    }
  }, []);

  // Fresh login (clientId appears/changes): fetch submission status so the
  // voucher/payment triggers know whether to show the form.
  useEffect(() => {
    if (!user?.clientId) {
      setSubmitted(null);
      prevUserClientIdRef.current = undefined;
      return;
    }
    const fresh = prevUserClientIdRef.current !== user.clientId;
    prevUserClientIdRef.current = user.clientId;
    if (fresh) {
      clearCooldown("voucher-fetched");
      clearCooldown("payment-pending");
      void refreshSubmitted(user.clientId);
    } else if (submittedRef.current === null) {
      // Same user across re-render/reload: fill in status if still unknown.
      void refreshSubmitted(user.clientId);
    }
  }, [user?.clientId, refreshSubmitted]);

  // Event entry point for voucher-fetched / payment-pending.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      const trigger = (e as CustomEvent<FeedbackTrigger>).detail;
      tryShow(trigger);
    };
    window.addEventListener("feedback:prompt", onPrompt);
    return () => window.removeEventListener("feedback:prompt", onPrompt);
  }, [tryShow]);

  return (
    <FeedbackForm
      open={open}
      onClose={() => setOpen(false)}
      onSubmitted={() => setSubmitted(true)}
    />
  );
}
