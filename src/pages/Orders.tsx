import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuthContext } from "@/contexts/AuthContext";
import { brandApi, giftcardApiClient } from "@/lib/valuedesignApi";
import { ScratchCard } from "@/components/ScratchCard";
import { FloatingCoins } from "@/components/FloatingCoins";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tag, ShoppingBag, Clock, CheckCircle, XCircle, RefreshCw,
  ChevronDown, ChevronUp, BookOpen, CheckCircle2, Calendar,
  CreditCard, Lock, AlertTriangle, Loader2, RotateCcw, ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getImageUrl as getImageUrlUtil, FALLBACK_IMAGE } from "@/utils/imageUrl";

const FALLBACK = FALLBACK_IMAGE;
const REDEEMED_KEY = "g360_redeemed_vouchers";

// ── Map API order ─────────────────────────────────────────────────────────────
const mapOrder = (order: any) => {
  const mappedItems = Array.isArray(order?.items)
    ? order.items.map((item: any) => {
        const groups = Array.isArray(item?.gift_voucher_item_coupon_details)
          ? item.gift_voucher_item_coupon_details : [];
        const coupons = groups.map((g: any) => ({
          coupon_id: g?.coupon_id || "",
          vd_raw_response: {
            brand_details: [{
              product_name: item?.meta?.brand_name || "",
              items: Array.isArray(g?.items) ? g.items : [],
            }],
          },
        }));
        return { ...item, coupons, meta: item?.meta || {} };
      })
    : [];
  return {
    ...order,
    items: mappedItems,
    total_amount: Number(order?.pricing?.final_payable ?? order?.pricing?.subtotal ?? order?.total_amount ?? 0),
  };
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getImageUrl = (meta: any): string => {
  return getImageUrlUtil(meta) || FALLBACK;
};

interface VoucherView {
  key: string; cardNumber: string; cardPin: string; expiryDate: string; amount: string;
}

const extractVouchers = (order: any): VoucherView[] => {
  const results: VoucherView[] = [];
  for (const item of (order?.items || [])) {
    (item?.coupons || []).forEach((c: any, ci: number) => {
      (c?.vd_raw_response?.brand_details || []).forEach((b: any) => {
        (b?.items || []).forEach((v: any, vi: number) => {
          results.push({
            key: `${item.order_item_id}-${ci}-${vi}`,
            cardNumber: v?.getCardNo || "",
            cardPin: v?.getCardPin || "",
            expiryDate: v?.getExpiryDate || "",
            amount: v?.balanceTotal || "",
          });
        });
      });
    });
  }
  return results;
};

// Balance check — Shubhang to build: GET /api/v1/voucher/balance-check?cardNo={cardNo}
// Returns: { balance: string, status: "ACTIVE"|"USED" }
const checkVoucherBalance = async (cardNo: string) => {
  const res = await giftcardApiClient.get(`/v1/voucher/balance-check?cardNo=${encodeURIComponent(cardNo)}`);
  return res.data as { balance: string; status: string };
};

// ── Redeem Sheet ──────────────────────────────────────────────────────────────
function RedeemSheet({
  vouchers, brandName, redeemSteps, onClose, onConfirmed,
}: {
  vouchers: VoucherView[]; brandName: string; redeemSteps?: string | null;
  onClose: () => void; onConfirmed: () => void;
}) {
  const [step, setStep] = useState<"details" | "steps">("details");
  const [checkState, setCheckState] = useState<"idle" | "checking" | "used" | "active" | "error">("idle");
  const [balances, setBalances] = useState<Record<string, string>>({});

  const handleCheck = async () => {
    if (!vouchers.length) { onConfirmed(); onClose(); return; }
    setCheckState("checking");
    try {
      const results = await Promise.all(
        vouchers.map(v => checkVoucherBalance(v.cardNumber).then(r => ({ cardNo: v.cardNumber, balance: r.balance })))
      );
      const map: Record<string, string> = {};
      results.forEach(r => { map[r.cardNo] = r.balance; });
      setBalances(map);
      const allZero = results.every(r => parseFloat(r.balance) === 0);
      setCheckState(allZero ? "used" : "active");
      if (allZero) setTimeout(() => { onConfirmed(); onClose(); }, 1200);
    } catch {
      setCheckState("error");
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-h-[88vh] overflow-y-auto shadow-g-card-lg"
        style={{ animation: "g-slide-up 0.4s cubic-bezier(.32,.72,.34,1) both" }}>
        <div className="p-5">
          <div className="w-10 h-1.5 rounded-full bg-border mx-auto mb-4" />

          {/* Tabs */}
          <div className="flex bg-muted rounded-2xl p-1 mb-5">
            {[{ id: "details", label: "Voucher Details" }, ...(redeemSteps ? [{ id: "steps", label: "How to Redeem" }] : [])].map(t => (
              <button key={t.id} onClick={() => setStep(t.id as any)}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all ${step === t.id ? "shadow-g-tile" : ""}`}
                style={step === t.id ? { background: "linear-gradient(90deg, #7b5cff, #5a4bff)", color: "white" } : { color: "#888888" }}>
                {t.label}
              </button>
            ))}
          </div>

          {step === "details" ? (
            <>
              <h3 className="text-base font-extrabold mb-4">{brandName}</h3>

              {/* Voucher codes — plain display */}
              <div className="space-y-3 mb-5">
                {vouchers.map((v, i) => {
                  const bal = balances[v.cardNumber];
                  const isUsed = bal !== undefined && parseFloat(bal) === 0;
                  return (
                    <div key={v.key} className="rounded-2xl border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#888888" }}>Voucher {vouchers.length > 1 ? i + 1 : ""}</p>
                        {bal !== undefined ? (
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isUsed ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                            {isUsed ? "✓ USED" : `Balance: ₹${bal}`}
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary">₹{v.amount}</span>
                        )}
                      </div>
                      <div className="bg-muted rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1"><CreditCard size={12} style={{ color: "#7b5cff" }} /><p className="text-[10px] font-semibold" style={{ color: "#888888" }}>Card Number</p></div>
                        <p className="font-mono font-black text-lg tracking-widest text-foreground break-all">{v.cardNumber || "—"}</p>
                      </div>
                      {v.cardPin && (
                        <div className="bg-muted rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1"><Lock size={12} style={{ color: "#7b5cff" }} /><p className="text-[10px] font-semibold" style={{ color: "#888888" }}>PIN</p></div>
                          <p className="font-mono font-black text-lg tracking-widest text-foreground">{v.cardPin}</p>
                        </div>
                      )}
                      {v.expiryDate && <p className="text-xs" style={{ color: "#888888" }}>Expires: <span className="font-bold" style={{ color: "#1a1a1a" }}>{v.expiryDate}</span></p>}
                    </div>
                  );
                })}
              </div>

              {/* Status messages */}
              {checkState === "used" && (
                <div className="mb-4 p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 flex items-center gap-3">
                  <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">Voucher confirmed used! Moving to Redeemed...</p>
                </div>
              )}
              {checkState === "active" && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">Voucher not yet used</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">This voucher still has balance. Please use it at the merchant first.</p>
                  </div>
                </div>
              )}
              {checkState === "error" && (
                <div className="mb-4 p-3 rounded-2xl bg-muted border border-border flex items-start gap-3">
                  <AlertTriangle size={18} style={{ color: "#888888" }} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#1a1a1a" }}>Balance check unavailable</p>
                    <p className="text-xs mt-0.5" style={{ color: "#888888" }}>Cannot verify automatically. Confirm manually if you've used this voucher at the merchant.</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={onClose}>Close</Button>
                {checkState === "error" ? (
                  <Button className="flex-1 h-12 rounded-2xl font-bold"
                    style={{ background: "linear-gradient(90deg, #ff8aa0, #7b5cff)" }}
                    onClick={() => { onConfirmed(); onClose(); }}>
                    Mark as Redeemed
                  </Button>
                ) : checkState === "active" ? (
                  <Button className="flex-1 h-12 rounded-2xl font-bold opacity-50 cursor-not-allowed" disabled>
                    Not Used Yet
                  </Button>
                ) : (
                  <Button className="flex-1 h-12 rounded-2xl font-bold flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(90deg, #ff8aa0, #7b5cff)" }}
                    onClick={handleCheck}
                    disabled={checkState === "checking" || checkState === "used"}>
                    {checkState === "checking" ? <><Loader2 size={16} className="g-spin" />Checking...</> : "I've Used This Voucher"}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-base font-extrabold mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-primary" />How to Redeem at {brandName}
              </h3>
              <div className="text-sm leading-relaxed font-medium whitespace-pre-line mb-6" style={{ color: "#888888" }}>{redeemSteps}</div>
              <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => setStep("details")}>Back to Voucher Details</Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Voucher Card (PAID, not redeemed) ─────────────────────────────────────────
function VoucherCard({ order, expanded, onToggle, onRedeemed }: {
  order: any; expanded: boolean; onToggle: () => void; onRedeemed: (order: any, vouchers: VoucherView[]) => void;
}) {
  const [showSheet, setShowSheet] = useState(false);
  const item = order.items?.[0];
  const meta = item?.meta || {};
  const brandName = meta.brand_name || `Order #${(order.order_number || "").slice(-8)}`;
  const imageUrl = getImageUrl(meta);
  const redeemSteps = meta.redeem_steps || meta.RedeemSteps || meta.how_to_redeem || null;
  const vouchers = extractVouchers(order);
  const paidAmount = Number(order?.pricing?.final_payable ?? order?.total_amount ?? 0);
  const dateStr = order.created_at ? format(new Date(order.created_at), "MM/yyyy - hh:mma") : "";

  return (
    <>
       <div
         className="bg-white overflow-hidden"
         style={{
           borderRadius: 12,
           boxShadow: "0px 4px 16px -6px rgba(0, 0, 0, 0.12)",
         }}
       >
        <div className="flex items-start p-4 gap-3" style={{ minHeight: 120 }}>
          <div className="w-[60px] h-[88px] shrink-0 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
            <img src={imageUrl} alt={brandName} className="w-full h-full object-contain"
              onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
          </div>
          <div className="flex-1 min-w-0 self-stretch flex flex-col justify-between">
           <div>
             <p className="font-semibold text-base leading-6 text-black truncate">{brandName}</p>
             <p className="font-normal text-xs leading-[18px] text-black mt-0.5">₹{paidAmount.toFixed(0)}</p>
           </div>
           <button
             onClick={() => setShowSheet(true)}
             className="w-[100px] h-[30px] rounded-[20px] font-semibold text-base text-white flex items-center justify-center"
             style={{ background: "linear-gradient(90deg, #6354D3 0%, #7b5cff 100%)" }}
           >
             Redeem
           </button>
            {dateStr && (
              <p className="text-[8px] leading-3 font-normal" style={{ color: "#5E5E5E" }}>{dateStr}</p>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="w-full text-center text-xs font-medium py-2 flex items-center justify-center gap-1"
        style={{ color: "#7b5cff" }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? "Hide Vouchers" : "View Vouchers"}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {vouchers.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {vouchers.map((v, i) => (
                <ScratchCard key={v.key} cardNumber={v.cardNumber} cardPin={v.cardPin}
                  expiryDate={v.expiryDate} amount={v.amount} index={i} />
              ))}
            </div>
          ) : (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
              ⏳ Vouchers are being generated. Please refresh in a moment.
            </div>
          )}
        </div>
      )}

      {showSheet && (
        <RedeemSheet vouchers={vouchers} brandName={brandName} redeemSteps={redeemSteps}
          onClose={() => setShowSheet(false)}
          onConfirmed={() => { onRedeemed(order, vouchers); setShowSheet(false); }} />
      )}
    </>
  );
}

// ── Pending Card ──────────────────────────────────────────────────────────────
function PendingCard({ order }: { order: any }) {
  const item = order.items?.[0];
  const meta = item?.meta || {};
  const brandName = meta.brand_name || `Order #${(order.order_number || "").slice(-8)}`;
  const imageUrl = getImageUrl(meta);
  const amount = Number(order?.pricing?.final_payable ?? order?.total_amount ?? 0);
  const dateStr = order.created_at ? format(new Date(order.created_at), "MM/yyyy - hh:mma") : "";
  const { toast } = useToast();

  const handleRetry = () => {
    toast({ title: "Retry Payment", description: "Please go to cart to retry payment for this order.", duration: 3000 });
  };

  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: "0.5px solid #A1A1A1",
        boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)",
        borderRadius: 10,
      }}
    >
      <div className="flex items-start p-4 gap-3" style={{ minHeight: 120 }}>
        <div className="w-[60px] h-[88px] shrink-0 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          <img src={imageUrl} alt={brandName} className="w-full h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
        </div>
        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-between">
          <div>
            <p className="font-semibold text-base leading-6 text-black truncate">{brandName}</p>
            <p className="font-normal text-xs leading-[18px] text-black mt-0.5">₹{amount.toFixed(0)}</p>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-[10px] py-0 flex items-center gap-1"
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
                <Clock size={9} />PENDING
              </Badge>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="w-[100px] h-[30px] rounded-[20px] font-semibold text-base text-white flex items-center justify-center gap-1.5"
            style={{ background: "linear-gradient(90deg, #FD79A8 0%, #B96BC6 50%, #6C5CE7 100%)" }}
          >
            <RotateCcw size={14} />Retry
          </button>
          {dateStr && (
            <p className="text-[8px] leading-3 font-normal" style={{ color: "#5E5E5E" }}>{dateStr}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Redeemed Card ─────────────────────────────────────────────────────────────
function RedeemedCard({ item }: { item: any }) {
  const vouchers: VoucherView[] = item.vouchers || [];
  const dateStr = item.redeemedAt ? format(new Date(item.redeemedAt), "MM/yyyy - hh:mma") : "";
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: "0.5px solid #A1A1A1",
        boxShadow: "4px 4px 4px rgba(0, 0, 0, 0.25)",
        borderRadius: 10,
      }}
    >
      <div className="flex items-start p-4 gap-3" style={{ minHeight: 120 }}>
        <div className="w-[60px] h-[88px] shrink-0 flex items-center justify-center bg-muted rounded-lg overflow-hidden">
          <img src={item.image || getImageUrl(item.meta)} alt={item.brandName} className="w-full h-full object-contain"
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK; }} />
        </div>
        <div className="flex-1 min-w-0 self-stretch flex flex-col justify-between">
          <div>
            <p className="font-semibold text-base leading-6 text-black truncate">{item.brandName}</p>
            <p className="font-normal text-xs leading-[18px] text-black mt-0.5">₹{item.amount?.toLocaleString("en-IN")}</p>
            <span className="inline-block mt-1 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">REDEEMED</span>
          </div>
          {vouchers.length > 0 && (
            <div className="space-y-0.5">
              {vouchers.map((v, i) => (
                <p key={i} className="font-mono text-[10px] font-medium truncate" style={{ color: "#888888" }}>
                  {v.cardNumber || "—"}
                </p>
              ))}
            </div>
          )}
          {dateStr && (
            <p className="text-[8px] leading-3 font-normal" style={{ color: "#5E5E5E" }}>Redeemed {dateStr}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: any; title: string; subtitle: string; action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "linear-gradient(135deg, rgba(123, 92, 255, 0.1), rgba(255, 138, 160, 0.1))" }}>
        <Icon className="h-10 w-10" style={{ color: "#7b5cff" }} />
      </div>
      <h2 className="text-xl font-extrabold mb-2" style={{ color: "#1a1a1a" }}>{title}</h2>
      <p className="text-sm font-medium mb-6" style={{ color: "#888888" }}>{subtitle}</p>
      {action}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = "vouchers" | "pending" | "redeemed";

export default function Orders() {
  const { user, isAuthenticated } = useAuthContext();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("vouchers");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [redeemed, setRedeemed] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem(REDEEMED_KEY) || "[]"); } catch { return []; }
  });

  const fetchOrders = useCallback(async () => {
    if (!user?.clientId) { setOrders([]); return; }
    setLoading(true); setError(false);
    try {
      const res = await brandApi.post("/v1/neworders", { clientId: user.clientId, timeline: 12 });
      const raw = Array.isArray(res?.data?.orders) ? res.data.orders : [];
      setOrders(raw.map(mapOrder).sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch { setError(true); setOrders([]); }
    finally { setLoading(false); }
  }, [user?.clientId]);

  useEffect(() => { if (isAuthenticated) fetchOrders(); }, [isAuthenticated, fetchOrders]);

  // Check if we just came from payment — auto-expand latest paid order
  useEffect(() => {
    if (!orders.length) return;
    const justPaid = sessionStorage.getItem('justReturnedFromPayment');
    if (justPaid) {
      sessionStorage.removeItem('justReturnedFromPayment');
      setTab("vouchers");
      const latest = orders.find(o => o.status?.toUpperCase() === "PAID");
      if (latest) setExpandedId(latest.order_id || latest.order_number);
    }
  }, [orders]);

  const redeemedIds = new Set(redeemed.map((r: any) => r.id || r.orderNumber));

  const handleRedeemed = (order: any, vouchers: VoucherView[]) => {
    const item = order.items?.[0];
    const meta = item?.meta || {};
    const entry = {
      id: order.order_id || order.order_number,
      orderNumber: order.order_number,
      brandName: meta.brand_name || "Voucher",
      amount: order.total_amount,
      image: getImageUrl(meta),
      vouchers,
      redeemedAt: new Date().toISOString(),
    };
    const updated = [entry, ...redeemed];
    setRedeemed(updated);
    localStorage.setItem(REDEEMED_KEY, JSON.stringify(updated));
    setSuccessOrder(entry);
  };

  // Split orders into buckets
  const paidOrders = orders.filter(o =>
    o.status?.toUpperCase() === "PAID" &&
    !redeemedIds.has(o.order_id) &&
    !redeemedIds.has(o.order_number)
  );
  const pendingOrders = orders.filter(o =>
    ["PENDING", "FAILED", "CANCELLED"].includes(o.status?.toUpperCase())
  );

  const tabs: { id: Tab; label: string; Icon: any; count?: number }[] = [
    { id: "vouchers", label: "Vouchers", Icon: Tag, count: paidOrders.length },
    { id: "pending", label: "Pending", Icon: Clock, count: pendingOrders.length },
    { id: "redeemed", label: "Redeemed", Icon: CheckCircle2, count: redeemed.length },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-hero-aurora">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
          <FloatingCoins count={6} />
          <div className="relative text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-amber-300" />
            </div>
            <h2 className="text-xl font-extrabold mb-2 text-gold-gradient">Please Login</h2>
            <p className="text-white/65 text-sm font-medium mb-6">Login to view your vouchers</p>
            <Link href="/login">
              <Button className="rounded-2xl font-bold px-8 h-12 bg-gold-gradient text-amber-950 hover:opacity-90">Sign In</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(179.64deg, #9747FF -354.99%, #FFFFFF 99.68%)" }}>
      <Header />
      <main className="flex-1 pb-24 md:pb-0 relative">
        <FloatingCoins count={6} />
        {/* Aurora header */}
        <div className="relative py-8 px-4 sm:px-6 lg:px-10">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setLocation("/")}
              className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1a1a1a] shadow-sm transition-all hover:bg-white/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </button>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p style={{ color: "#888888", fontSize: "12px", fontWeight: "500", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your wallet</p>
                <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#1a1a1a" }}>My Vouchers</h1>
              </div>
              <button onClick={fetchOrders}
                className="w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ background: "white", boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)" }}>
                <RefreshCw size={16} className={`${loading ? "g-spin" : ""}`} style={{ color: "#7b5cff" }} />
              </button>
            </div>
            {/* 3 equal tabs - pill style */}
            <div className="flex rounded-full bg-white p-1 mx-4" style={{ border: "1px solid #F0F0F0" }}>
              {tabs.map(({ id, label, Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full font-semibold text-[11px] transition-all ${
                    tab === id ? "text-white shadow-sm" : "text-[#6B7280]"
                  }`}
                  style={
                    tab === id
                      ? { background: "linear-gradient(90deg, #7B61FF, #5B3FFF)" }
                      : { background: "transparent" }
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{(count ?? 0) > 0 ? `${count} ` : ""}{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 g-skeleton rounded-3xl" />)}</div>
          ) : error ? (
            <div className="text-center py-16">
              <XCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
              <p className="font-bold mb-1">Failed to load</p>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>Could not fetch your orders</p>
              <Button onClick={fetchOrders} className="rounded-2xl font-bold">Retry</Button>
            </div>
          ) : tab === "vouchers" ? (
            paidOrders.length === 0 ? (
              <EmptyState icon={Tag} title="No Vouchers Yet"
                subtitle="Your purchased vouchers will appear here after payment"
                action={<Link href="/brands"><Button className="rounded-2xl h-12 px-8 font-bold shadow-g-primary">Browse Brands</Button></Link>} />
            ) : (
              <div className="space-y-4">
                {paidOrders.map(order => {
                  const id = order.order_id || order.order_number;
                  return (
                    <VoucherCard key={id} order={order}
                      expanded={expandedId === id}
                      onToggle={() => setExpandedId(prev => prev === id ? null : id)}
                      onRedeemed={handleRedeemed} />
                  );
                })}
              </div>
            )
          ) : tab === "pending" ? (
            pendingOrders.length === 0 ? (
              <EmptyState icon={Clock} title="No Pending Orders" subtitle="All your orders have been processed" />
            ) : (
              <div className="space-y-4">
                {pendingOrders.map(order => <PendingCard key={order.order_id || order.order_number} order={order} />)}
              </div>
            )
          ) : (
            redeemed.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No Redeemed Vouchers"
                subtitle="Vouchers you've used at merchants will appear here after balance confirmation" />
            ) : (
              <div className="space-y-4">
                {redeemed.map((item: any) => <RedeemedCard key={item.id} item={item} />)}
              </div>
            )
          )}
        </div>

        {successOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.72)" }}>
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${12 + (i * 6) % 72}%`,
                    top: `${18 + (i * 11) % 56}%`,
                    width: `${4 + (i % 3)}px`,
                    height: `${4 + (i % 3)}px`,
                    background: ["#ff8aa0", "#7b5cff", "#f59e0b", "#22c55e", "#38bdf8"][i % 5],
                    animation: `g-float-up 1.6s ease-out ${i * 0.05}s infinite`,
                  }}
                />
              ))}
            </div>

            <div className="relative w-full max-w-[360px] rounded-[28px] bg-white shadow-2xl overflow-hidden" style={{ minHeight: 560 }}>
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full" style={{ background: "linear-gradient(180deg, #ecfeff 0%, #dcfce7 100%)" }}>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "linear-gradient(180deg, #7b5cff 0%, #5a4bff 100%)" }}>
                    <CheckCircle2 size={34} className="text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-extrabold" style={{ color: "#1a1a1a" }}>Voucher Redeemed</h2>
                <p className="mt-2 text-sm font-medium" style={{ color: "#888888" }}>Successfully</p>
              </div>

              <div className="flex justify-center px-6 py-2">
                <div className="h-[280px] w-full rounded-[32px] bg-gradient-to-b from-white to-[#f7f3ff] border border-[#ece7ff] shadow-inner flex flex-col items-center justify-center text-center px-5">
                  <div className="mb-4 h-16 w-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(123, 92, 255, 0.16), rgba(255, 138, 160, 0.16))" }}>
                    <BookOpen size={28} style={{ color: "#7b5cff" }} />
                  </div>
                  <p className="text-lg font-extrabold" style={{ color: "#1a1a1a" }}>{successOrder.brandName}</p>
                  <p className="mt-2 text-sm font-medium" style={{ color: "#888888" }}>Tap below to open the redeemed voucher details.</p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4">
                <Button
                  className="w-full h-12 rounded-2xl font-bold"
                  style={{ background: "linear-gradient(90deg, #7b5cff, #5a4bff)", color: "white", border: "none" }}
                  onClick={() => {
                    setTab("redeemed");
                    setExpandedId(null);
                    setSuccessOrder(null);
                  }}
                >
                  View Voucher
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
