import { useState, useEffect, useRef, useCallback } from "react";
import { LifeBuoy, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import PaymentDetailsSheet from "@/components/PaymentDetailsSheet";
import {
  createSupportTicket,
  getSupportTicketThread,
  sendSupportTicketMessage,
  TicketClosedError,
  type TicketMessage,
  type TicketStatus,
} from "@/api/supportTicketApi";

const TICKET_ID_KEY = "gift360_support_ticket_id";
const POLL_INTERVAL_MS = 10000;
const FAST_POLL_MS = 2000;          // while waiting for Sahil's reply
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

// Sahil can end a message with "[[options: A | B | C]]"; the widget shows these as tap-to-send buttons.
const OPTIONS_RE = /\n?\[\[options:\s*([^\]]*)\]\]\s*$/;
function splitOptions(message: string): { text: string; options: string[] } {
  const m = message.match(OPTIONS_RE);
  if (!m) return { text: message, options: [] };
  return { text: message.replace(OPTIONS_RE, ""), options: m[1].split("|").map((o) => o.trim()).filter(Boolean) };
}

export default function SupportChatWidget() {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);

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
    seenMessageCountRef.current = 0;
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

  const handleSubmit = async () => {
    // Logged-in users always have an identity even if their profile has no
    // saved display name (e.g. mobile-OTP login) — fall back through what we
    // do have rather than blocking them on a field we don't even show them.
    const effectiveName = user
      ? name.trim() || user.name || user.mobile || user.email || "Gift360 User"
      : name.trim();

    if (!effectiveName || !message.trim()) {
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
        message: message.trim(),
      });
      sessionStorage.setItem(storageKeyFor(user), response.publicId);
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
    seenMessageCountRef.current = 0;
  };

  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <>
      <div className="fixed bottom-[72px] right-4 z-40">
        <button
          onClick={toggleOpen}
          className={`relative flex items-center justify-center active:scale-90 transition-all duration-500 ease-in-out ${
            !open && askLabelVisible ? "h-12 rounded-full pl-3.5 pr-4 gap-2" : "h-12 w-12 rounded-full"
          }`}
          style={{
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
          }}
          aria-label={open ? "Close chat with Sahil" : "Chat with Sahil"}
        >
          {open ? (
            <X className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
          ) : (
            <>
              <LifeBuoy className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
              <span
                className={`text-xs font-bold text-white whitespace-nowrap overflow-hidden transition-all duration-500 ${
                  askLabelVisible ? "max-w-[90px] opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Ask Sahil
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
        <div className="fixed bottom-[132px] right-4 z-50 w-[320px] max-w-[calc(100vw-2rem)] max-h-[65vh] flex flex-col rounded-xl border bg-card border-card-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-base font-bold">S</div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Sahil</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-300" />
                  Your chatbot friend is here
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="ml-auto h-8 w-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!ticketId ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                  placeholder="Hi, I'm Sahil! Ask me anything about SuperCoins, vouchers or orders…"
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
                onClick={handleSubmit}
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
                    Sahil is on it. Your message has been received.
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
                          <p className="text-[10px] font-semibold text-blue-600 mb-0.5">
                            {m.senderType === "BOT" ? "Sahil" : "Gift360 Support"}
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
                          className={`mt-1 text-[10px] ${
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
                      <span className="font-semibold text-blue-600">Sahil</span> is typing
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
