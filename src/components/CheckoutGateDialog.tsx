// src/components/CheckoutGateDialog.tsx
// Shown before a payment starts, only when the server asks for it:
//   1. confirm the email with a 6-digit code (task 4)
//   2. share location, or type a PIN code (task 5)
// Mounted once in App. Opened by runCheckoutGate() in src/lib/checkoutGate.ts.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  confirmEmailCode,
  sendEmailCode,
  type CheckoutLocation,
  type ConfirmStatus,
  type SendStatus,
} from "@/api/checkoutApi";
import {
  CHECKOUT_GATE_EVENT,
  CheckoutCancelledError,
  setCheckoutGateMounted,
  type CheckoutGateRequest,
} from "@/lib/checkoutGate";
import { getDevicePosition, reverseGeocode } from "@/utils/geolocation";

type Step = "email" | "location";

const PIN_RE = /^[1-9][0-9]{5}$/;

export const invalidEmailMessage = (reason?: string | null): string => {
  switch (reason) {
    case "DISPOSABLE":
      return "Temporary email addresses can't receive invoices and vouchers. Please use your regular email.";
    case "TOO_MANY_ACCOUNTS":
      return "This email is already used by other Gift360 accounts. Please use a different email.";
    case "NO_MAIL_DOMAIN":
      return "We can't deliver email to this address. Please check it for typos.";
    case "EMPTY":
      return "Your account has no email address yet.";
    default:
      return "This email address doesn't look right.";
  }
};

export const sendStatusMessage = (s: SendStatus, retryAfter?: number | null): string | null => {
  switch (s) {
    case "SENT":
      return null;
    case "RATE_LIMITED":
      return "Too many codes requested. Please try again in an hour.";
    case "LOCKED":
      return `Too many wrong codes. Try again in ${Math.ceil((retryAfter ?? 1800) / 60)} minutes.`;
    case "SEND_FAILED":
      return "We couldn't send the code just now. Please try again.";
    case "INVALID_EMAIL":
    case "IN_USE":
      return "This email can't be verified. Please update it in your Profile.";
    default:
      return null;
  }
};

export const confirmStatusMessage = (s: ConfirmStatus, attemptsLeft?: number | null): string | null => {
  switch (s) {
    case "WRONG_CODE":
      return `That code is not right. ${attemptsLeft ?? 0} ${attemptsLeft === 1 ? "try" : "tries"} left.`;
    case "EXPIRED":
      return "That code has expired. Please send a new one.";
    case "NO_CODE":
      return "Please send a code first.";
    case "LOCKED":
      return "Too many wrong codes. Please try again in 30 minutes.";
    default:
      return null;
  }
};

export default function CheckoutGateDialog() {
  const [req, setReq] = useState<CheckoutGateRequest | null>(null);
  const [step, setStep] = useState<Step>("email");
  const [emailDone, setEmailDone] = useState(false);
  const settled = useRef(false);

  // email step
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());

  // location step
  const [consent, setConsent] = useState(false);
  const [locMode, setLocMode] = useState<"choose" | "confirm" | "pin">("choose");
  const [gps, setGps] = useState<CheckoutLocation | null>(null);
  const [gpsLabel, setGpsLabel] = useState("");
  const [pin, setPin] = useState("");
  const [locMsg, setLocMsg] = useState<string | null>(null);

  useEffect(() => {
    setCheckoutGateMounted(true);
    const onGate = (e: Event) => {
      const detail = (e as CustomEvent<CheckoutGateRequest>).detail;
      settled.current = false;
      setReq(detail);
      setStep(detail.needEmail ? "email" : "location");
      setEmailDone(!detail.needEmail);
      setCodeSent(false);
      setCode("");
      setEmailMsg(null);
      setConsent(false);
      setLocMode("choose");
      setGps(null);
      setGpsLabel("");
      setPin("");
      setLocMsg(null);
    };
    window.addEventListener(CHECKOUT_GATE_EVENT, onGate);
    return () => {
      setCheckoutGateMounted(false);
      window.removeEventListener(CHECKOUT_GATE_EVENT, onGate);
    };
  }, []);

  useEffect(() => {
    if (!codeSent) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [codeSent]);

  const email = req?.requirements.email;
  const location = req?.requirements.location;
  const emailRequired = !!email?.required;
  const locationRequired = !!location?.required;

  const finish = useCallback(
    (loc: CheckoutLocation | undefined) => {
      if (!req || settled.current) return;
      settled.current = true;
      req.resolve(loc);
      setReq(null);
    },
    [req]
  );

  const cancel = useCallback(() => {
    if (!req || settled.current) return;
    settled.current = true;
    req.reject(new CheckoutCancelledError());
    setReq(null);
  }, [req]);

  const afterEmail = useCallback(() => {
    setEmailDone(true);
    if (req?.needLocation) setStep("location");
    else finish(undefined);
  }, [req, finish]);

  // Closing the dialog: skip what is optional, cancel if something required is missing.
  const onOpenChange = (open: boolean) => {
    if (open) return;
    if (step === "email" && emailRequired) return cancel();
    if (step === "location" && locationRequired) return cancel();
    if (step === "email") return afterEmail();
    finish(undefined);
  };

  const doSend = async () => {
    setBusy(true);
    setEmailMsg(null);
    try {
      const r = await sendEmailCode();
      if (r.status === "ALREADY_VERIFIED") return afterEmail();
      if (r.status === "SENT") {
        setCodeSent(true);
        setResendAt(Date.now() + 30_000);
        setNow(Date.now());
      }
      setEmailMsg(sendStatusMessage(r.status, r.retryAfterSeconds));
    } catch {
      setEmailMsg("We couldn't send the code just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setEmailMsg(null);
    try {
      const r = await confirmEmailCode(code);
      if (r.status === "VERIFIED" || r.status === "ALREADY_VERIFIED") return afterEmail();
      setEmailMsg(confirmStatusMessage(r.status, r.attemptsLeft));
      setCode("");
    } catch {
      setEmailMsg("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const useMyLocation = async () => {
    setBusy(true);
    setLocMsg(null);
    const r = await getDevicePosition();
    if ("error" in r) {
      setBusy(false);
      setLocMsg(
        r.error === "DENIED"
          ? "Location permission is off. You can enter your PIN code instead."
          : "We couldn't get your location. You can enter your PIN code instead."
      );
      if (location?.pinFallback) setLocMode("pin");
      return;
    }
    const p = (r as { ok: true; position: import("@/utils/geolocation").DevicePosition }).position;
    const place = await reverseGeocode(p.lat, p.lng).catch(() => null);
    setGps({
      source: "GPS",
      latitude: p.lat,
      longitude: p.lng,
      accuracyMeters: p.accuracy,
      capturedAt: p.timestamp,
      pincode: place?.postcode && PIN_RE.test(place.postcode) ? place.postcode : undefined,
      city: place?.city || undefined,
      state: place?.state || undefined,
      consent: true,
    });
    setGpsLabel(
      [place?.city, place?.state].filter(Boolean).join(", ") +
        (place?.postcode ? ` · PIN ${place.postcode}` : "") || "Location found"
    );
    setLocMode("confirm");
    setBusy(false);
  };

  const confirmPin = () => {
    const clean = pin.replace(/\s/g, "");
    if (!PIN_RE.test(clean)) {
      setLocMsg("Please enter a valid 6-digit PIN code.");
      return;
    }
    finish({ source: "PIN", pincode: clean, capturedAt: Date.now(), consent: true });
  };

  if (!req) return null;

  const canResend = codeSent && now >= resendAt;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {step === "email" && email && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm your email</DialogTitle>
              <DialogDescription>
                Your invoice and vouchers are sent here. Confirm it once before you pay.
              </DialogDescription>
            </DialogHeader>

            {email.invalidReason ? (
              <div className="space-y-2 text-sm">
                <p className="text-red-600">{invalidEmailMessage(email.invalidReason)}</p>
                {email.maskedEmail && <p className="text-gray-600">Current email: {email.maskedEmail}</p>}
                {email.suggestion && <p className="text-gray-600">Did you mean {email.suggestion}?</p>}
                <p className="text-gray-600">Please update it in your Profile, then come back to pay.</p>
              </div>
            ) : !codeSent ? (
              <p className="text-sm text-gray-700">
                We'll send a 6-digit code to <span className="font-medium">{email.maskedEmail}</span>.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">
                  Enter the code sent to <span className="font-medium">{email.maskedEmail}</span>. It expires in 10 minutes.
                </p>
                <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="numeric" autoFocus>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            )}

            {emailMsg && <p className="text-sm text-red-600" role="alert">{emailMsg}</p>}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {email.invalidReason ? (
                <Button onClick={() => { cancel(); window.location.assign("/profile"); }}>Go to Profile</Button>
              ) : !codeSent ? (
                <Button onClick={doSend} disabled={busy}>{busy ? "Sending…" : "Send code"}</Button>
              ) : (
                <>
                  <Button onClick={doConfirm} disabled={busy || code.length !== 6}>
                    {busy ? "Checking…" : "Verify"}
                  </Button>
                  <Button variant="ghost" onClick={doSend} disabled={busy || !canResend}>
                    {canResend ? "Send a new code" : `Send a new code in ${Math.max(0, Math.ceil((resendAt - now) / 1000))}s`}
                  </Button>
                </>
              )}
              {!emailRequired && (
                <Button variant="ghost" onClick={afterEmail} disabled={busy}>Skip for now</Button>
              )}
            </DialogFooter>
          </>
        )}

        {step === "location" && location && emailDone && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm your location</DialogTitle>
              <DialogDescription>{location.notice}</DialogDescription>
            </DialogHeader>

            <label className="flex items-start gap-2 text-sm text-gray-700">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>I agree to share my location for this payment.</span>
            </label>

            {locMode === "confirm" && gps && (
              <p className="text-sm text-gray-800">
                You are in <span className="font-medium">{gpsLabel}</span>. Is this right?
              </p>
            )}

            {locMode === "pin" && (
              <div className="space-y-1">
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit PIN code"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                  aria-label="PIN code"
                />
              </div>
            )}

            {locMsg && <p className="text-sm text-red-600" role="alert">{locMsg}</p>}

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {locMode === "choose" && (
                <Button onClick={useMyLocation} disabled={busy || !consent}>
                  {busy ? "Finding you…" : "Use my location"}
                </Button>
              )}
              {locMode === "confirm" && gps && (
                <Button onClick={() => finish({ ...gps, consent: true })} disabled={!consent}>
                  Yes, continue to pay
                </Button>
              )}
              {locMode === "pin" && (
                <Button onClick={confirmPin} disabled={!consent || pin.length !== 6}>
                  Continue with this PIN code
                </Button>
              )}
              {location.pinFallback && locMode !== "pin" && (
                <Button variant="ghost" onClick={() => { setLocMode("pin"); setLocMsg(null); }} disabled={busy}>
                  Enter PIN code instead
                </Button>
              )}
              {locMode !== "choose" && (
                <Button variant="ghost" onClick={() => { setLocMode("choose"); setLocMsg(null); }} disabled={busy}>
                  Use my location instead
                </Button>
              )}
              {!locationRequired && (
                <Button variant="ghost" onClick={() => finish(undefined)} disabled={busy}>Skip</Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
