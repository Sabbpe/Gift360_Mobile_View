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
        className="sm:max-w-md w-[calc(100%-2rem)] rounded-2xl p-0 overflow-hidden"
        onInteractOutside={(e) => { if (isLoading) e.preventDefault(); }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-semibold font-[Outfit]">
              {step === "choice" ? "What would you like to do?" : "Gift this voucher"}
            </DialogTitle>
            <DialogDescription className="text-indigo-200 text-sm mt-1">
              {step === "choice" ? `${brandName} · ₹${voucherAmount}` : "Personalise your gift below."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6">
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
        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group">
        <div className="w-11 h-11 rounded-xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center flex-shrink-0 transition-colors">
          {isScratchLoading ? <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" /> : <Sparkles className="h-5 w-5 text-indigo-600" />}
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Use myself</p>
          <p className="text-xs text-slate-500 mt-0.5">Reveal the code now for personal use</p>
        </div>
      </button>

      <button onClick={onGift} disabled={isLoading}
        className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group">
        <div className="w-11 h-11 rounded-xl bg-rose-100 group-hover:bg-rose-200 flex items-center justify-center flex-shrink-0 transition-colors">
          <Gift className="h-5 w-5 text-rose-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">Gift to someone</p>
          <p className="text-xs text-slate-500 mt-0.5">Send via email, WhatsApp, or both</p>
        </div>
      </button>

      <button onClick={onLater} disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all text-sm font-medium disabled:opacity-50">
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
    { value: "WHATSAPP", label: "WhatsApp",    sub: "Instant delivery",    icon: <MessageCircle className="h-4 w-4" /> },
    { value: "EMAIL",    label: "Email",       sub: "Rich gift card",      icon: <Mail className="h-4 w-4" /> },
    { value: "BOTH",     label: "Both",        sub: "Maximum reach",       icon: <><MessageCircle className="h-3.5 w-3.5" /><Mail className="h-3.5 w-3.5" /></> },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {opts.map(o => (
        <button key={o.value} onClick={() => setChannel(o.value)} disabled={isLoading}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center disabled:opacity-50 ${
            channel === o.value
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-slate-200 hover:border-indigo-300 text-slate-600"
          }`}>
          <div className="flex items-center gap-0.5">{o.icon}</div>
          <span className="text-xs font-semibold">{o.label}</span>
          <span className="text-[10px] text-slate-400 leading-tight">{o.sub}</span>
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
        <Label className="text-sm font-medium text-slate-700">Send via</Label>
        <ChannelPicker channel={channel} setChannel={setChannel} isLoading={isLoading} />
      </div>

      {/* WhatsApp number */}
      {(channel === "WHATSAPP" || channel === "BOTH") && (
        <div className="space-y-1.5">
          <Label htmlFor="recipient-mobile" className="text-sm font-medium text-slate-700">
            WhatsApp number <span className="text-rose-500">*</span>
            <span className="text-slate-400 font-normal ml-1">(with country code, e.g. 919876543210)</span>
          </Label>
          <div className="relative">
            <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 pointer-events-none" />
            <Input id="recipient-mobile" type="tel" placeholder="919876543210"
              value={recipientMobile} onChange={(e) => setRecipientMobile(e.target.value)}
              disabled={isLoading} className={`pl-9 ${mobileError ? "border-red-400" : ""}`} autoComplete="off" />
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
          <Label htmlFor="recipient-email" className="text-sm font-medium text-slate-700">
            Email address <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input id="recipient-email" type="email" placeholder="friend@example.com"
              value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={isLoading} className={`pl-9 ${emailError ? "border-red-400" : ""}`} autoComplete="off" />
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
        <Label htmlFor="sender-name" className="text-sm font-medium text-slate-700">
          Your name <span className="text-slate-400 font-normal">(shown on the gift)</span>
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input id="sender-name" type="text" placeholder="e.g. Priya"
            value={senderName} onChange={(e) => setSenderName(e.target.value)}
            disabled={isLoading} maxLength={100} className="pl-9" autoComplete="off" />
        </div>
      </div>

      {/* Personal message */}
      <div className="space-y-1.5">
        <Label htmlFor="personal-message" className="text-sm font-medium text-slate-700">
          Personal message <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Textarea id="personal-message" placeholder="Add a note…"
          value={personalMessage} onChange={(e) => setPersonalMessage(e.target.value)}
          disabled={isLoading} maxLength={500} rows={3} className="resize-none text-sm" />
        <p className="text-xs text-slate-400 text-right">{personalMessage.length}/500</p>
      </div>

      {/* Media upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Add a photo or video <span className="text-slate-400 font-normal">(optional · max 20 MB)</span>
        </Label>
        {mediaPreview ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-200">
            {mediaType === "image"
              ? <img src={mediaPreview} alt="preview" className="w-full max-h-40 object-cover" />
              : <video src={mediaPreview} className="w-full max-h-40 object-cover" controls muted />}
            <button onClick={onClearMedia} disabled={isLoading}
              className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full hover:bg-white transition-colors"
              aria-label="Remove media">
              <Trash2 className="h-3.5 w-3.5 text-slate-600" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-all text-sm font-medium disabled:opacity-50">
            {isUploadingMedia
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Camera className="h-4 w-4" /><Video className="h-4 w-4" /> Upload photo or video</>}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*,video/*"
          onChange={onFileSelect} className="hidden" aria-label="Upload gift media" />
        {mediaError && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-amber-500" />{mediaError}
          </div>
        )}
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600" />
        <span>Once gifted, the voucher code will be sent only to the recipient. You won't be able to view or use it.</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" onClick={onBack} disabled={isLoading} className="flex-1">Back</Button>
        <Button onClick={onConfirm} disabled={isLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
          {isGiftLoading || isUploadingMedia
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isUploadingMedia ? "Uploading…" : "Sending…"}</>
            : <><Gift className="mr-2 h-4 w-4" />Send Gift</>}
        </Button>
      </div>
    </div>
  );
}
