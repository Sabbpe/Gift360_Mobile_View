import { useState, useEffect, useRef, useCallback } from "react";
import { LifeBuoy, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Thread state
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<TicketStatus | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

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
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, ticketId, ticketStatus, fetchMessages]);

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
    } catch (err: any) {
      setFormError(err.message || "Failed to submit your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!ticketId || !replyText.trim()) return;
    const text = replyText.trim();
    setSendingReply(true);
    setReplyError(null);
    try {
      const saved = await sendSupportTicketMessage(ticketId, text);
      setMessages((prev) => [...prev, saved]);
      setReplyText("");
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
          aria-label={open ? "Close support chat" : "Open support chat"}
        >
          {open ? (
            <X className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
          ) : (
            <>
              <LifeBuoy className="h-5 w-5 text-white flex-shrink-0" strokeWidth={2.2} />
              <span
                className={`text-xs font-bold text-white whitespace-nowrap overflow-hidden transition-all duration-500 ${
                  askLabelVisible ? "max-w-[70px] opacity-100" : "max-w-0 opacity-0"
                }`}
              >
                Ask Us!!
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
            <h3 className="text-sm font-bold">Support Chat</h3>
            <p className="text-xs text-blue-100">We usually reply within a few hours</p>
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
                  placeholder="How can we help you?"
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
                    Your message has been received. Our support team will respond here shortly.
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
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
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
                    onClick={handleSendReply}
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
    </>
  );
}
