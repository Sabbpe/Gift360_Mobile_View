import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import {
  createSupportTicket,
  getSupportTicketThread,
  sendSupportTicketMessage,
  sendSupportFeedback,
  TicketClosedError,
  type TicketMessage,
  type TicketStatus,
} from "@/api/supportTicketApi";

const TICKET_ID_KEY = "gift360_support_ticket_id";
const POLL_INTERVAL_MS = 10000;
const FAST_POLL_MS = 2000;          // while waiting for Shebby's reply
const TYPING_MAX_MS = 25000;        // stop showing "typing" if no reply arrives

// Scopes the remembered ticket to who's actually using the widget right now,
// so a guest's ticket never surfaces for a different logged-in account (or
// vice versa) on the same browser. sessionStorage (not localStorage) also
// means it only lasts for the current browser session, not indefinitely.
function identityFor(user: { clientId?: string; email?: string } | null | undefined) {
  return user?.clientId || user?.email || "guest";
}
function storageKeyFor(user: { clientId?: string; email?: string } | null | undefined) {
  return `${TICKET_ID_KEY}:${identityFor(user)}`;
}

// Shebby can end a message with "[[options: A | B | C]]" (tap-to-send buttons) and can
// include "[[go: /path]]" to open an app page while the chat stays open.
const OPTIONS_RE = /\n?\[\[options:\s*([^\]]*)\]\]\s*$/;
const GO_RE = /\n?\[\[go:\s*([^\]]*)\]\]/g;
function splitOptions(message: string): { text: string; options: string[]; go: string | null } {
  let text = message;
  let options: string[] = [];
  const m = text.match(OPTIONS_RE);
  if (m) {
    options = m[1].split("|").map((o) => o.trim()).filter(Boolean);
    text = text.replace(OPTIONS_RE, "");
  }
  let go: string | null = null;
  text = text.replace(GO_RE, (_x, p) => {
    go = String(p).trim();
    return "";
  });
  return { text: text.trimEnd(), options, go };
}

// The only pages the chat is allowed to open. Anything else (admin, login, reseller...) is ignored.
const GO_PAGES: Record<string, string> = {
  "/offers": "Offers",
  "/brands": "All brands",
  "/nearby": "Offers Near You",
  "/categories": "Categories",
  "/my-orders": "My Orders",
  "/rewards": "Rewards",
  "/faq": "FAQ",
  "/bulk-purchase": "Bulk purchase",
  "/supercoin-voucher": "SuperCoin vouchers",
  "/cart": "Your cart",
  "/refund": "Refund policy",
  "/terms": "Terms",
  "/privacy": "Privacy policy",
};
function allowedGoPath(raw: string | null): { path: string; label: string } | null {
  if (!raw) return null;
  const p = raw.trim();
  if (GO_PAGES[p]) return { path: p, label: GO_PAGES[p] };
  if (/^\/brands\/[A-Za-z0-9_-]{1,80}$/.test(p)) return { path: p, label: "Brand page" };
  if (/^\/faq\/[A-Za-z0-9_-]{1,80}$/.test(p)) return { path: p, label: "FAQ answer" };
  return null;
}
const msgKey = (m: TicketMessage, i: number) => `${m.id ?? i}:${m.createdAt}`;

// Tap-to-start choices shown before a conversation exists. "go" opens a page (no ticket needed);
// "say" starts the conversation with that text.
const START_CHIPS: { icon: string; label: string; go?: string; say?: string }[] = [
  { icon: "\u{1F4CD}", label: "Offers near me", go: "/nearby" },
  { icon: "\u{1F525}", label: "Top offers today", go: "/offers" },
  { icon: "\u{1F4B0}", label: "SuperCoins & cashback", say: "SuperCoins" },
  { icon: "\u{1F4E6}", label: "Orders & payment help", say: "Orders" },
  { icon: "\u{1F6CD}\uFE0F", label: "Browse brands", go: "/brands" },
];

export default function SupportChatWidget() {
  const { user } = useAuthContext();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);               // typed-question form (instead of the tap menu)
  const [compact, setCompact] = useState(false);                 // smaller panel so the page behind stays visible
  const [navNote, setNavNote] = useState<{ label: string } | null>(null);
  const baselineRef = useRef(false);                             // true once the existing thread has been loaded
  const doneNavRef = useRef<Set<string>>(new Set());             // messages whose [[go:]] was already handled

  // Tell the rest of the app the support panel is open so the quick-question
  // bubble stays out of the way (one floating element at a time).
  useEffect(() => {
    if (open) document.body.dataset.supportChatOpen = "1";
    else delete document.body.dataset.supportChatOpen;
    return () => {
      delete document.body.dataset.supportChatOpen;
    };
  }, [open]);

  const [ticketId, setTicketId] = useState<string | null>(() =>
    sessionStorage.getItem(storageKeyFor(user))
  );

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [mobile, setMobile] = useState(user?.mobile || "");
  const [message, setMessage] = useState("");
  const [sheetBrandId, setSheetBrandId] = useState<string | null>(null);   // "Buy now" opens the normal buy sheet
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Thread state
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  // Set when the customer sends a message; cleared when a BOT/ADMIN reply arrives or after TYPING_MAX_MS.
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [, forceTick] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Whether an admin reply has arrived that the user hasn't opened the panel
  // to see yet — drives the blinking dot on the launcher button.
  const [hasUnread, setHasUnread] = useState(false);
  const seenMessageCountRef = useRef(0);

  // "Ask Us!!" label on the launcher fades in and out on a loop (rather than
  // only on hover) so touch users see it too, not just desktop mouse users.
  const [askLabelVisible, setAskLabelVisible] = useState(true);

  // Reply (user follow-up message) state
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // 👍/👎 on Shebby's answers: votes just made in this session (the server copy comes with each message)
  const [votes, setVotes] = useState<Record<number, "UP" | "DOWN">>({});
  const [votingId, setVotingId] = useState<number | null>(null);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
    if (user?.email && !email) setEmail(user.email);
    if (user?.mobile && !mobile) setMobile(user.mobile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Switching identity (guest -> logged in, logout, or a different account on
  // the same browser) swaps to that identity's own remembered ticket (or none).
  const identityKey = identityFor(user);
  useEffect(() => {
    setTicketId(sessionStorage.getItem(storageKeyFor(user)));
    setMessages([]);
    setTicketStatus(null);
    setHasUnread(false);
    setVotes({});
    seenMessageCountRef.current = 0;
    baselineRef.current = false;
    doneNavRef.current = new Set();
    setShowForm(false);
    setNavNote(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey]);

  // `markSeen` distinguishes a fetch made while the panel is open (the user is
  // looking, so nothing counts as unread) from a background poll made while
  // it's closed (a new admin message there should light up the launcher dot).
  const fetchMessages = useCallback(async (id: string, markSeen: boolean) => {
    try {
      const thread = await getSupportTicketThread(id);
      setMessages((prev) =>
        thread.messages.length !== prev.length ? thread.messages : prev
      );
      setTicketStatus(thread.status);
      setThreadError(null);

      const latest = thread.messages[thread.messages.length - 1];
      if (latest && latest.senderType !== "USER") setWaitingSince(null);
      if (markSeen) {
        seenMessageCountRef.current = thread.messages.length;
        setHasUnread(false);
      } else if (thread.messages.length > seenMessageCountRef.current && latest?.senderType === "ADMIN") {
        setHasUnread(true);
      }
    } catch (err: any) {
      setThreadError(err.message || "Failed to load messages");
    }
  }, []);

  // Poll every 10s as long as a ticket exists and isn't closed — even while
  // the panel is collapsed, so an admin reply can light up the launcher dot
  // instead of only surfacing once the user happens to open the widget.
  useEffect(() => {
    if (!ticketId || ticketStatus === "CLOSED") {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    if (open) setLoadingMessages(true);
    fetchMessages(ticketId, open).finally(() => setLoadingMessages(false));

    pollRef.current = window.setInterval(() => {
      fetchMessages(ticketId, open);
    }, waitingSince ? FAST_POLL_MS : POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, ticketId, ticketStatus, fetchMessages, waitingSince]);

  // expire the typing indicator, and allow other pages (FAQ) to open the chat
  useEffect(() => {
    if (!waitingSince) return;
    const id = window.setTimeout(() => setWaitingSince(null), Math.max(0, TYPING_MAX_MS - (Date.now() - waitingSince)));
    return () => window.clearTimeout(id);
  }, [waitingSince]);
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener("gift360:open-support-chat", openChat);
    return () => window.removeEventListener("gift360:open-support-chat", openChat);
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, waitingSince]);

  // Loops the "Ask Us!!" label on/off while the launcher is collapsed —
  // paused once the panel is open, since the button is icon-only (X) then.
  useEffect(() => {
    if (open) return;
    const id = window.setInterval(() => {
      setAskLabelVisible((v) => !v);
    }, 2500);
    return () => window.clearInterval(id);
  }, [open]);

  const handleSubmit = async (override?: string) => {
    // Logged-in users always have an identity even if their profile has no
    // saved display name (e.g. mobile-OTP login) — fall back through what we
    // do have rather than blocking them on a field we don't even show them.
    const effectiveName = user
      ? name.trim() || user.name || user.mobile || user.email || "Gift360 User"
      : name.trim();

    const msgText = (typeof override === "string" ? override : message).trim();
    if (!effectiveName || !msgText) {
      setFormError("Please enter your name and a message.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const response = await createSupportTicket({
        name: effectiveName,
        email: email.trim() || undefined,
        mobile: mobile.trim() || undefined,
        message: msgText,
      });
      sessionStorage.setItem(storageKeyFor(user), response.publicId);
      baselineRef.current = true;                 // a brand-new thread: its first bot reply may open a page
      doneNavRef.current = new Set();
      setTicketId(response.publicId);
      setMessages([]);
      setWaitingSince(Date.now());
    } catch (err: any) {
      setFormError(err.message || "Failed to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (override?: string) => {
    const raw = typeof override === "string" ? override : replyText;
    if (!ticketId || !raw.trim()) return;
    const text = raw.trim();
    setSendingReply(true);
    setReplyError(null);
    try {
      const saved = await sendSupportTicketMessage(ticketId, text);
      setMessages((prev) => [...prev, saved]);
      setReplyText("");
      setWaitingSince(Date.now());
    } catch (err: any) {
      if (err instanceof TicketClosedError) {
        // The ticket closed (e.g. an admin closed it) since our last poll —
        // reflect that immediately instead of surfacing a generic send error.
        setTicketStatus("CLOSED");
      } else {
        setReplyError(err.message || "Failed to send your message.");
      }
    } finally {
      setSendingReply(false);
    }
  };

  // Rate one of Shebby's answers. The backend also posts Shebby's follow-up line, so refresh the thread.
  const handleVote = async (messageId: number, vote: "UP" | "DOWN") => {
    if (!ticketId || votingId !== null) return;
    setVotingId(messageId);
    try {
      await sendSupportFeedback(ticketId, messageId, vote);
      setVotes((prev) => ({ ...prev, [messageId]: vote }));
      await fetchMessages(ticketId, true);
    } catch (err: any) {
      setReplyError(err.message || "Could not save your feedback.");
    } finally {
      setVotingId(null);
    }
  };

  // A closed ticket is done — clear it so the widget falls back to the
  // intake form and the user starts a fresh conversation instead of
  // reopening the old one.
  const handleStartNewChat = () => {
    sessionStorage.removeItem(storageKeyFor(user));
    setTicketId(null);
    setMessages([]);
    setTicketStatus(null);
    setThreadError(null);
    setReplyError(null);
    setReplyText("");
    setMessage("");
    setHasUnread(false);
    setWaitingSince(null);
    setVotes({});
    seenMessageCountRef.current = 0;
    baselineRef.current = false;
    doneNavRef.current = new Set();
    setShowForm(false);
    setNavNote(null);
  };

  // Open an allowed page and keep the chat open on top of it.
  const openPage = (path: string) => {
    const g = allowedGoPath(path);
    if (!g) return;
    setLocation(g.path);
    setNavNote({ label: g.label });
    setCompact(true);
  };

  // Start a conversation from a tapped choice. Logged-in users start straight away;
  // guests add their name first (so the team can reply) with the text already filled in.
  const startWith = (text: string) => {
    if (user) {
      void handleSubmit(text);
    } else {
      setMessage(text);
      setShowForm(true);
    }
  };

  // When Shebby's newest reply carries [[go: /page]], open that page once, only while the panel is open,
  // and never for messages that were already in the thread when it loaded.
  useEffect(() => {
    if (!messages.length) return;
    if (!baselineRef.current) {
      messages.forEach((m, i) => doneNavRef.current.add(msgKey(m, i)));
      baselineRef.current = true;
      return;
    }
    const i = messages.length - 1;
    const m = messages[i];
    const k = msgKey(m, i);
    if (doneNavRef.current.has(k)) return;
    doneNavRef.current.add(k);
    if (m.senderType !== "BOT" || !open) return;
    const g = allowedGoPath(splitOptions(m.message).go);
    if (g) openPage(g.path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, open]);

  const navStrip = navNote ? (
    <div className="flex-shrink-0 px-3 py-1.5 bg-green-50 border-t border-green-200 flex items-center gap-2 text-[11px] font-semibold text-green-700">
      <span>{"\u2794"} Opened {navNote.label}</span>
      <button type="button" className="ml-auto underline" onClick={() => { window.history.back(); setNavNote(null); }}>Back</button>
      <button type="button" aria-label="Dismiss" onClick={() => setNavNote(null)}>{"\u00D7"}</button>
    </div>
  ) : null;

  const firstName = (user?.name || "").trim().split(/\s+/)[0];

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <>
      <div className="support-fab fixed bottom-[72px] right-4 z-40">
        <button
          onClick={toggleOpen}
          className={`relative flex items-center justify-center active:scale-90 transition-all duration-500 ease-in-out ${
            !open && askLabelVisible ? "h-12 rounded-full pl-3.5 pr-4 gap-2" : "h-12 w-12 rounded-full"
          }`}
          style={{
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
          }}
          aria-label={open ? "Close chat" : "Ask us"}
        >
          {open ? (
            <X className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
          ) : (
            <>
              <MessageCircle className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
              <span
                className={`text-xs font-bold text-white whitespace-nowrap overflow-hidden transition-all duration-500 ${
                  askLabelVisible ? "max-w-[90px] opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Ask Us
              </span>
            </>
          )}
          {!open && hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5" title="New message from support">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500 border-2 border-white" />
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className={`fixed bottom-[132px] right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] ${compact ? "max-h-[42vh]" : "max-h-[65vh]"} flex flex-col rounded-xl border bg-card border-card-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200`}>
          <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-base font-bold">S</div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Shebby</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-300" />
                  Here to help you with offers
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {ticketId && ticketStatus !== "CLOSED" && (
                  <button
                    type="button"
                    disabled={sendingReply || !!waitingSince}
                    onClick={() => handleSendReply("Menu")}
                    className="h-8 rounded-full px-3 text-[11px] font-bold bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
                  >
                    {"\u2630"} Menu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCompact((c) => !c)}
                  aria-label={compact ? "Make chat bigger" : "Make chat smaller"}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20"
                >
                  {compact ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="h-8 w-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {!ticketId && !showForm ? (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/30">
                <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-3 py-2 text-sm text-gray-800">
                  <p className="text-[11px] font-semibold text-blue-600 mb-0.5">Shebby</p>
                  <p>{firstName ? `Hi ${firstName}! \u{1F44B}` : "Hi! \u{1F44B}"} I'm here to help you with offers.</p>
                  <p className="mt-1 font-semibold">Want to see offers near you?</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {START_CHIPS.map((c, i) => (
                    <button
                      key={c.label}
                      type="button"
                      disabled={submitting}
                      onClick={() => (c.go ? openPage(c.go) : startWith(c.say || c.label))}
                      className={`rounded-full border border-blue-600 px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                        i === 0 ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50 bg-white"
                      }`}
                    >
                      {c.icon} {c.label}
                    </button>
                  ))}
                </div>
                {formError && <p className="text-xs text-red-600">{formError}</p>}
              </div>
              {navStrip}
              <div className="flex-shrink-0 px-2.5 py-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowForm(true)}>
                  {"\u270D\uFE0F"} Type my question
                </Button>
              </div>
            </>
          ) : !ticketId ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <button type="button" className="text-xs font-medium text-blue-600" onClick={() => setShowForm(false)}>
                {"\u2190"} Back to menu
              </button>
              {!user && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Name<span className="text-destructive"> *</span>
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Mobile</label>
                    <Input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="Your mobile number"
                      className="text-sm"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Message<span className="text-destructive"> *</span>
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask me anything about offers, SuperCoins, vouchers or orders…"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                  <p className="text-xs text-red-600">{formError}</p>
                </div>
              )}

              <Button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Start conversation"
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/30">
                {loadingMessages && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Shebby is on it. Your message has been received.
                  </p>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex ${m.senderType === "USER" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          m.senderType === "USER"
                            ? "bg-blue-600 text-white rounded-br-sm"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        {m.senderType !== "USER" && (
                          <p className="text-[11px] font-semibold text-blue-600 mb-0.5">
                            {m.senderType === "BOT" ? "Shebby" : "Gift360 Support"}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">
                          {splitOptions(m.message).text.split(/(https?:\/\/\S+)/g).map((part, i) =>
                            /^https?:\/\//.test(part) ? (
                              <a key={i} href={part} className="underline text-blue-600 break-all" target={part.includes(window.location.host) ? "_self" : "_blank"} rel="noopener noreferrer"
                                onClick={(e) => {
                                  const bm = part.match(/\/brands\/([^/\s?#]+)/);
                                  if (bm) { e.preventDefault(); setSheetBrandId(bm[1]); setOpen(false); }
                                }}>{part.includes("/faq/") ? "Read the full answer" : part.includes("/brands/") ? "Buy now" : part}</a>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </p>
                        {m.senderType === "BOT" && m.id != null && !!m.intentKey && (() => {
                          const mid = m.id as number;
                          const vote = votes[mid] ?? m.vote ?? null;
                          // only the latest answer takes votes; older ones stay visible but grey
                          const active = idx === messages.length - 1 && ticketStatus !== "CLOSED" && !waitingSince && votingId === null;
                          const btn = (v: "UP" | "DOWN", label: string, Icon: typeof ThumbsUp) => (
                            <button
                              type="button"
                              disabled={!active}
                              aria-label={label}
                              aria-pressed={vote === v}
                              onClick={() => handleVote(mid, v)}
                              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                                vote === v
                                  ? "border-blue-600 bg-blue-50 text-blue-600"
                                  : "border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600"
                              } ${active ? "" : "opacity-50 cursor-default hover:border-gray-200 hover:text-gray-500"}`}
                            >
                              <Icon className="h-3 w-3" />
                            </button>
                          );
                          return (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                              <span>Was this helpful?</span>
                              {btn("UP", "Yes, this helped", ThumbsUp)}
                              {btn("DOWN", "No, this did not help", ThumbsDown)}
                            </div>
                          );
                        })()}
                        {m.senderType !== "USER" && idx === messages.length - 1 && ticketStatus !== "CLOSED" && !waitingSince && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {splitOptions(m.message).options.map((o) => (
                              <button
                                key={o}
                                type="button"
                                disabled={sendingReply}
                                onClick={() => handleSendReply(o)}
                                className="rounded-full border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              >
                                {o}
                              </button>
                            ))}
                          </div>
                        )}
                        <p
                          className={`mt-1 text-[11px] ${
                            m.senderType === "USER" ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                {waitingSince && ticketStatus !== "CLOSED" && (
                  <div className="flex justify-start" aria-live="polite">
                    <div className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-semibold text-blue-600">Shebby</span> is typing
                      <span className="flex gap-0.5">
                        {[0, 150, 300].map((d) => (
                          <span key={d} className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>
              {navStrip}
              {threadError && (
                <div className="flex-shrink-0 px-3 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-600">{threadError}</p>
                </div>
              )}
              {replyError && (
                <div className="flex-shrink-0 px-3 py-2 bg-red-50 border-t border-red-200">
                  <p className="text-xs text-red-600">{replyError}</p>
                </div>
              )}
              {ticketStatus === "CLOSED" ? (
                <div className="flex-shrink-0 px-3 py-3 border-t border-gray-100 space-y-2 bg-muted/20">
                  <p className="text-xs text-muted-foreground text-center">
                    This conversation is closed.
                  </p>
                  <Button onClick={handleStartNewChat} className="w-full" size="sm">
                    Start New Conversation
                  </Button>
                </div>
              ) : (
                <div className="flex-shrink-0 px-2.5 py-2 border-t border-gray-100 flex items-end gap-1.5">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="Type a message…"
                    rows={1}
                    className="text-sm resize-none min-h-[36px] max-h-[100px] py-2"
                    disabled={sendingReply}
                  />
                  <Button
                    onClick={() => handleSendReply()}
                    disabled={sendingReply || !replyText.trim()}
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    aria-label="Send message"
                  >
                    {sendingReply ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <PaymentDetailsSheet brandId={sheetBrandId} open={!!sheetBrandId} onClose={() => setSheetBrandId(null)} />
    </>
  );
}
