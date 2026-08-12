// components/ScratchGate.tsx
import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import {
  Gift, Sparkles, X, Loader2, AlertCircle, Camera, Video, Trash2, User,
  Mail, MessageCircle,
} from "lucide-react";
import { getMediaUploadUrl } from "@/api/giftingApi";
import type { DeliveryChannel } from "@/types/order";

type GateStep = "choice" | "gift_form";

interface ScratchGateProps {
  open:             boolean;
  onClose:          () => void;
  onConfirmScratch: () => Promise<void>;
  onConfirmGift: (args: {
    recipientEmail?:  string;
    recipientMobile?: string;
    deliveryChannel:  DeliveryChannel;
    personalMessage?: string;
    senderName?:      string;
    mediaUrl?:        string;
  }) => Promise<void>;
  isScratchLoading: boolean;
  isGiftLoading:    boolean;
  brandName:        string;
  voucherAmount:    string;
  orderItemId:      string;
}

export function ScratchGate({
  open, onClose, onConfirmScratch, onConfirmGift,
  isScratchLoading, isGiftLoading, brandName, voucherAmount, orderItemId,
}: ScratchGateProps) {
  const [step,             setStep]             = useState<GateStep>("choice");
  const [channel,          setChannel]          = useState<DeliveryChannel>("WHATSAPP");
  const [recipientEmail,   setRecipientEmail]   = useState("");
  const [recipientMobile,  setRecipientMobile]  = useState("");
  const [senderName,       setSenderName]       = useState("");
  const [personalMessage,  setPersonalMessage]  = useState("");
  const [emailError,       setEmailError]       = useState("");
  const [mobileError,      setMobileError]      = useState("");
  const [mediaFile,        setMediaFile]        = useState<File | null>(null);
  const [mediaPreview,     setMediaPreview]     = useState<string | null>(null);
  const [mediaType,        setMediaType]        = useState<"image" | "video" | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError,       setMediaError]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = isScratchLoading || isGiftLoading || isUploadingMedia;

  const handleOpenChange = (isOpen: boolean) => { if (!isOpen) handleClose(); };

  const handleClose = () => {
    setStep("choice"); setChannel("WHATSAPP");
    setRecipientEmail(""); setRecipientMobile("");
    setSenderName(""); setPersonalMessage("");
    setEmailError(""); setMobileError("");
    setMediaFile(null); setMediaPreview(null); setMediaType(null); setMediaError("");
    onClose();
  };

  // ── Validation ─────────────────────────────────────────────────────────────

  const validateEmail  = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const validateMobile = (v: string) => /^\d{10,15}$/.test(v.replace(/[\s\-+]/g, ""));

  const validate = (): boolean => {
    let ok = true;
    setEmailError(""); setMobileError("");
    if (channel === "EMAIL" || channel === "BOTH") {
      if (!recipientEmail.trim()) { setEmailError("Email is required."); ok = false; }
      else if (!validateEmail(recipientEmail)) { setEmailError("Enter a valid email."); ok = false; }
    }
    if (channel === "WHATSAPP" || channel === "BOTH") {
      if (!recipientMobile.trim()) { setMobileError("Mobile number is required."); ok = false; }
      else if (!validateMobile(recipientMobile)) { setMobileError("Enter a valid 10–15 digit mobile number (e.g. 919876543210)."); ok = false; }
    }
    return ok;
  };

  // ── Media ──────────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaError("");
    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");
    if (!isImg && !isVid) { setMediaError("Only images and videos are supported."); return; }
    if (file.size > 20 * 1024 * 1024) { setMediaError("File must be under 20 MB."); return; }
    setMediaFile(file); setMediaType(isImg ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
  };

  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(null); setMediaType(null); setMediaError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadMedia = async (): Promise<string | undefined> => {
    if (!mediaFile) return undefined;
    setIsUploadingMedia(true);
    try {
      const { uploadUrl, cdnUrl } = await getMediaUploadUrl(orderItemId, mediaFile.type);
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mediaFile.type }, body: mediaFile });
      return cdnUrl;
    } catch {
      setMediaError("Media upload failed — gift will send without the photo/video.");
      return undefined;
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleGiftConfirm = async () => {
    if (!validate()) return;
    const cdnUrl = await uploadMedia();
    const mobile = recipientMobile.replace(/[\s\-+]/g, "") || undefined;
    await onConfirmGift({
      recipientEmail:  (channel === "EMAIL"  || channel === "BOTH") ? recipientEmail.trim() : undefined,
      recipientMobile: (channel === "WHATSAPP" || channel === "BOTH") ? mobile : undefined,
      deliveryChannel: channel,
      personalMessage: personalMessage.trim() || undefined,
      senderName:      senderName.trim() || undefined,
      mediaUrl:        cdnUrl,
    });
    handleClose();
  };

  const handleScratchConfirm = async () => { await onConfirmScratch(); handleClose(); };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md w-[calc(100%-2rem)] rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col"
        onInteractOutside={(e) => { if (isLoading) e.preventDefault(); }}
      >
        {/* Header — fixed, never scrolls */}
        <div className="bg-[#9747FF] p-6 text-white shrink-0">
          <DialogHeader>
            <DialogTitle className="text-black text-xl font-semibold">
              {step === "choice" ? "What would you like to do?" : "Gift this voucher"}
            </DialogTitle>
            <DialogDescription className="text-black/60 text-sm mt-1">
              {step === "choice" ? `${brandName} · ₹${voucherAmount}` : "Personalise your gift below."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body — the only scrollable region, so long forms (gift_form step
            with WhatsApp/email fields, message, media upload, and the
            Back/Send Gift buttons) never get clipped on short phone
            viewports the way they were under the old plain overflow-hidden
            container. */}
        <div className="p-6 overflow-y-auto" style={{ background: 'linear-gradient(179.75deg, #9747FF -117.65%, #FFFFFF 99.79%)' }}>
          {step === "choice" && (
            <ChoiceStep
              onScratch={handleScratchConfirm} onGift={() => setStep("gift_form")} onLater={handleClose}
              isScratchLoading={isScratchLoading} isLoading={isLoading}
            />
          )}
          {step === "gift_form" && (
            <GiftFormStep
              channel={channel} setChannel={setChannel}
              recipientEmail={recipientEmail} setRecipientEmail={setRecipientEmail}
              recipientMobile={recipientMobile} setRecipientMobile={setRecipientMobile}
              senderName={senderName} setSenderName={setSenderName}
              personalMessage={personalMessage} setPersonalMessage={setPersonalMessage}
              emailError={emailError} mobileError={mobileError}
              mediaPreview={mediaPreview} mediaType={mediaType}
              mediaError={mediaError} isUploadingMedia={isUploadingMedia}
              fileInputRef={fileInputRef} onFileSelect={handleFileSelect} onClearMedia={clearMedia}
              onConfirm={handleGiftConfirm} onBack={() => { setStep("choice"); setEmailError(""); setMobileError(""); }}
              isGiftLoading={isGiftLoading} isLoading={isLoading}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ChoiceStep ────────────────────────────────────────────────────────────────

function ChoiceStep({ onScratch, onGift, onLater, isScratchLoading, isLoading }: {
  onScratch: () => void; onGift: () => void; onLater: () => void;
  isScratchLoading: boolean; isLoading: boolean;
}) {
  return (
    <div className="space-y-3">
      <button onClick={onScratch} disabled={isLoading}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-gold-gradient text-amber-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group">
        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          {isScratchLoading ? <Loader2 className="h-5 w-5 text-amber-950 animate-spin" /> : <Sparkles className="h-5 w-5 text-amber-950" />}
        </div>
        <div>
          <p className="font-bold text-sm">Use myself</p>
          <p className="text-xs text-amber-950/70 mt-0.5">Reveal the code now for personal use</p>
        </div>
      </button>

      <button onClick={onGift} disabled={isLoading}
        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-[rgba(151,71,255,0.3)] hover:border-[#9747FF] hover:bg-[rgba(151,71,255,0.05)] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group">
        <div className="w-11 h-11 rounded-xl bg-[rgba(151,71,255,0.1)] group-hover:bg-[rgba(151,71,255,0.2)] flex items-center justify-center flex-shrink-0 transition-colors">
          <Gift className="h-5 w-5 text-[#9747FF]" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Gift to someone</p>
          <p className="text-xs text-slate-500 mt-0.5">Send via email, WhatsApp, or both</p>
        </div>
      </button>

      <button onClick={onLater} disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium disabled:opacity-50 min-h-[44px]">
        <X className="h-4 w-4" /> Decide later
      </button>
    </div>
  );
}

// ── ChannelPicker ─────────────────────────────────────────────────────────────

function ChannelPicker({ channel, setChannel, isLoading }: {
  channel: DeliveryChannel; setChannel: (c: DeliveryChannel) => void; isLoading: boolean;
}) {
  const opts: { value: DeliveryChannel; label: string; sub: string; icon: React.ReactNode }[] = [
    { value: "WHATSAPP", label: "WhatsApp",    sub: "Instant delivery",    icon: <MessageCircle className="h-4 w-4 text-emerald-500" /> },
    { value: "EMAIL",    label: "Email",       sub: "Rich gift card",      icon: <Mail className="h-4 w-4 text-[#9747FF]" /> },
    { value: "BOTH",     label: "Both",        sub: "Maximum reach",       icon: <><MessageCircle className="h-3.5 w-3.5 text-amber-500" /><Mail className="h-3.5 w-3.5 text-amber-500" /></> },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map(o => (
        <button key={o.value} onClick={() => setChannel(o.value)} disabled={isLoading}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center disabled:opacity-50 ${
            channel === o.value
              ? "border-[#9747FF] bg-[rgba(151,71,255,0.08)] text-[#9747FF]"
              : "border-slate-200 hover:border-[#9747FF]/40 text-black/70"
          }`}>
          <div className="flex items-center gap-0.5">{o.icon}</div>
          <span className="text-xs font-semibold">{o.label}</span>
          <span className="text-[10px] text-black/60 leading-tight">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ── GiftFormStep ──────────────────────────────────────────────────────────────

function GiftFormStep({
  channel, setChannel,
  recipientEmail, setRecipientEmail, recipientMobile, setRecipientMobile,
  senderName, setSenderName, personalMessage, setPersonalMessage,
  emailError, mobileError, mediaPreview, mediaType, mediaError, isUploadingMedia,
  fileInputRef, onFileSelect, onClearMedia,
  onConfirm, onBack, isGiftLoading, isLoading,
}: any) {
  return (
    <div className="space-y-4">

      {/* Channel picker */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-black">Send via</Label>
        <ChannelPicker channel={channel} setChannel={setChannel} isLoading={isLoading} />
      </div>

      {/* WhatsApp number */}
      {(channel === "WHATSAPP" || channel === "BOTH") && (
        <div className="space-y-1.5">
          <Label htmlFor="recipient-mobile" className="text-sm font-medium text-black">
            WhatsApp number <span className="text-rose-500">*</span>
            <span className="text-black/60 font-normal ml-1">(with country code, e.g. 919876543210)</span>
          </Label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 pointer-events-none" />
            <Input id="recipient-mobile" type="tel" placeholder="919876543210"
              value={recipientMobile} onChange={(e) => setRecipientMobile(e.target.value)}
              disabled={isLoading} className={`pl-9 bg-white border-slate-200 text-black placeholder:text-black/30 focus-visible:ring-[#9747FF]/50 focus-visible:border-[#9747FF] ${mobileError ? "border-red-400" : ""}`} autoComplete="off" />
          </div>
          {mobileError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{mobileError}
            </div>
          )}
        </div>
      )}

      {/* Email */}
      {(channel === "EMAIL" || channel === "BOTH") && (
        <div className="space-y-1.5">
          <Label htmlFor="recipient-email" className="text-sm font-medium text-black">
            Email address <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 pointer-events-none" />
            <Input id="recipient-email" type="email" placeholder="friend@example.com"
              value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={isLoading} className={`pl-9 bg-white border-slate-200 text-black placeholder:text-black/30 focus-visible:ring-[#9747FF]/50 focus-visible:border-[#9747FF] ${emailError ? "border-red-400" : ""}`} autoComplete="off" />
          </div>
          {emailError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />{emailError}
            </div>
          )}
        </div>
      )}

      {/* Sender name */}
      <div className="space-y-1.5">
        <Label htmlFor="sender-name" className="text-sm font-medium text-black">
          Your name <span className="text-black/60 font-normal">(shown on the gift)</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40 pointer-events-none" />
          <Input id="sender-name" type="text" placeholder="e.g. Priya"
            value={senderName} onChange={(e) => setSenderName(e.target.value)}
            disabled={isLoading} maxLength={100} className="pl-9 bg-white border-slate-200 text-black placeholder:text-black/30 focus-visible:ring-[#9747FF]/50 focus-visible:border-[#9747FF]" autoComplete="off" />
        </div>
      </div>

      {/* Personal message */}
      <div className="space-y-1.5">
        <Label htmlFor="personal-message" className="text-sm font-medium text-black">
          Personal message <span className="text-black/60 font-normal">(optional)</span>
        </Label>
        <Textarea id="personal-message" placeholder="Add a note…"
          value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)}
          disabled={isLoading} maxLength={500} rows={3} className="resize-none text-sm bg-white border-slate-200 text-black placeholder:text-black/30 focus-visible:ring-[#9747FF]/50 focus-visible:border-[#9747FF]" />
        <p className="text-xs text-black/60 text-right">{personalMessage.length}/500</p>
      </div>

      {/* Media upload — temporarily hidden, feature coming soon */}

      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-black">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
        <span>Once gifted, the voucher code will be sent only to the recipient. You won't be able to view or use it.</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="flex-1 border-slate-200 text-black hover:text-black/70 hover:bg-slate-50">Back</Button>
        <Button onClick={onConfirm} disabled={isLoading} className="flex-1 bg-gold-gradient text-amber-950 font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 border-0">
          {isGiftLoading || isUploadingMedia
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploadingMedia ? "Uploading…" : "Sending…"}</>
            : <><Gift className="mr-2 h-4 w-4" />Send Gift</>}
        </Button>
      </div>
    </div>
  );
}
