import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useAuthContext } from "@/contexts/AuthContext";
import { brandApi } from "@/lib/valuedesignApi";
import { Button } from "@/components/ui/button";
import {
  Tag, Clock, CreditCard, RefreshCw, ShoppingBag,
  XCircle, Eye, ArrowLeft,
} from "lucide-react";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { format } from "date-fns";
import { getImageUrl as getImageUrlUtil, FALLBACK_IMAGE } from "@/utils/imageUrl";

const FALLBACK = FALLBACK_IMAGE;

// A voucher is "issued" when at least one order item carries a coupon group
// (gift_voucher_item_coupon_details from /v1/neworders) or the item's
// provider status reached COMPLETE — same rule as the vouchers page.
const hasIssuedVoucher = (order: any): boolean =>
  (Array.isArray(order?.items) ? order.items : []).some(
    (it: any) =>
      (Array.isArray(it?.gift_voucher_item_coupon_details) &&
        it.gift_voucher_item_coupon_details.length > 0) ||
      String(it?.provider_status || it?.providerStatus || "").toUpperCase() === "COMPLETE"
  );

const getOrderAmount = (order: any): number =>
  Number(order?.pricing?.final_payable ?? order?.pricing?.subtotal ?? order?.total_amount ?? 0);

const getOrderStatus = (order: any): string => String(order?.status || "").toUpperCase();

// ── Order row ─────────────────────────────────────────────────────────────────
function OrderRow({
  order, onViewNow,
}: {
  order: any; onViewNow: (orderNumber: string) => void;
}) {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  const meta = items[0]?.meta || {};
  const brandName = meta.brand_name || `Order #${(order?.order_number || "").slice(-8)}`;
  const imageUrl = getImageUrlUtil(meta) || FALLBACK;
  const amount = getOrderAmount(order);
  const coinsRedeemed = Number(order?.pricing?.coins_redeemed ?? 0);
  const isSuperCoin =
    coinsRedeemed > 0 ||
    String(order?.payment_method || order?.type || "").toUpperCase() === "SUPERCOIN";
  const extraItems = items.length - 1;
  const status = getOrderStatus(order);
  const dateStr = order?.created_at
    ? format(new Date(order.created_at), "dd MMM yyyy, hh:mma")
    : "";

  const badge =
    status === "PENDING"
      ? { label: "Pending", bg: "#fff7ed", color: "#c2410c", border: "#fdba74" }
      : status === "FAILED"
        ? { label: "Failed", bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" }
        : hasIssuedVoucher(order)
          ? { label: "Vouchers Issued", bg: "#ecfdf5", color: "#047857", border: "#6ee7b7" }
          : { label: "Voucher Pending", bg: "#fefce8", color: "#a16207", border: "#fde047" };

  return (
    <div
      className="bg-white rounded-2xl p-3 flex gap-3"
      style={{ boxShadow: "0px 4px 16px -6px rgba(0, 0, 0, 0.12)" }}
    >
      <div className="w-[56px] h-[56px] shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
        <img
          src={imageUrl}
          alt={brandName}
          className="w-full h-full object-contain"
          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm leading-5 text-black truncate">
            {brandName}
            {extraItems > 0 && (
              <span className="ml-1.5 inline-block align-middle text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                +{extraItems} more
              </span>
            )}
          </p>
          {isSuperCoin && coinsRedeemed > 0 ? (
            <p className="shrink-0 font-bold text-[13px] text-[#7C3AED] flex items-center gap-1">
              {coinsRedeemed} <img src={superCoinIcon} alt="" className="h-3.5 w-3.5 inline-block" />
            </p>
          ) : (
            <p className="shrink-0 font-bold text-[13px] text-black">
              ₹{amount.toLocaleString("en-IN")}
            </p>
          )}
        </div>
        {order?.order_number && (
          <p className="font-mono text-[10px] leading-4 mt-0.5 truncate" style={{ color: "#888888" }}>
            Order #{order.order_number}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="shrink-0 inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
            >
              {badge.label}
            </span>
            {dateStr && (
              <span className="text-[9px] truncate" style={{ color: "#5E5E5E" }}>{dateStr}</span>
            )}
          </div>
          {status === "PENDING" && order?.order_number && (
            <button
              onClick={() => onViewNow(order.order_number)}
              className="shrink-0 h-[28px] px-3 rounded-[16px] font-semibold text-[11px] text-white flex items-center justify-center gap-1"
              style={{ background: "linear-gradient(90deg, #FD79A8 0%, #B96BC6 50%, #6C5CE7 100%)" }}
            >
              <Eye size={12} />
              Pay Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle }: {
  icon: any; title: string; subtitle: string;
}) {
  return (
    <div className="text-center py-16">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
        style={{ background: "linear-gradient(135deg, rgba(123, 92, 255, 0.1), rgba(255, 138, 160, 0.1))" }}
      >
        <Icon className="h-10 w-10" style={{ color: "#7b5cff" }} />
      </div>
      <h2 className="text-xl font-extrabold mb-2" style={{ color: "#1a1a1a" }}>{title}</h2>
      <p className="text-sm font-medium" style={{ color: "#888888" }}>{subtitle}</p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type OrdersTab = "vouchers" | "voucher-pending" | "payment-pending";

export default function MyOrders() {
  const { user, isAuthenticated } = useAuthContext();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<OrdersTab>("vouchers");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!user?.clientId) { setOrders([]); return; }
    setLoading(true);
    setError(false);
    try {
      const [cashRes, scRes] = await Promise.all([
        brandApi.post("/v1/neworders", { clientId: user.clientId, timeline: 12, type: "NORMAL" }),
        brandApi.post("/v1/neworders", { clientId: user.clientId, timeline: 12, type: "SUPERCOIN" }),
      ]);
      const sortFn = (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      const cash = Array.isArray(cashRes?.data?.orders) ? cashRes.data.orders : [];
      const sc = Array.isArray(scRes?.data?.orders) ? scRes.data.orders : [];
      // Tag each list with its payment type — payment_method can be missing
      // on older orders, and the type param on /v1/neworders filters by it.
      const seen = new Set<string>();
      const merged = [
          ...cash.map((o: any) => ({ ...o, __fetchType: "NORMAL" })),
          ...sc.map((o: any) => ({ ...o, __fetchType: "SUPERCOIN" })),
        ]
        .filter((o: any) => {
          const key = o?.order_number || o?.order_id;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort(sortFn);
      setOrders(merged);
    } catch {
      setError(true);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [user?.clientId]);

  useEffect(() => { if (isAuthenticated) fetchOrders(); }, [isAuthenticated, fetchOrders]);

  // Refetch when the user returns to this tab — e.g. coming back from an
  // abandoned payment gateway session (the backend reconciles payment state
  // on every read, so a settled transaction flips to PAID here).
  useEffect(() => {
    const onFocus = () => { if (isAuthenticated) fetchOrders(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isAuthenticated, fetchOrders]);

  const successOrders = useMemo(
    () => orders.filter(o => getOrderStatus(o) === "PAID" && hasIssuedVoucher(o)),
    [orders]
  );
  const voucherPendingOrders = useMemo(
    () =>
      orders.filter(
        o =>
          (getOrderStatus(o) === "PAID" && !hasIssuedVoucher(o)) ||
          getOrderStatus(o) === "FAILED"
      ),
    [orders]
  );
  const paymentPendingOrders = useMemo(
    () => orders.filter(o => getOrderStatus(o) === "PENDING"),
    [orders]
  );

  const handleViewNow = (orderNumber: string) => {
    // Show a read-only cart-style summary for this order.
    setLocation(`/my-orders/${orderNumber}/checkout`);
  };

  const tabs: { id: OrdersTab; label: string; Icon: any; count: number }[] = [
    { id: "vouchers", label: "Success", Icon: Tag, count: successOrders.length },
    { id: "voucher-pending", label: "Failed", Icon: Clock, count: voucherPendingOrders.length },
    { id: "payment-pending", label: "Pending", Icon: CreditCard, count: paymentPendingOrders.length },
  ];

  const visibleOrders =
    tab === "vouchers" ? successOrders
    : tab === "voucher-pending" ? voucherPendingOrders
    : paymentPendingOrders;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-hero-aurora">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-blackcard card-edge flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-amber-300" />
            </div>
            <h2 className="text-xl font-extrabold mb-2 text-gold-gradient">Please Login</h2>
            <p className="text-white/65 text-sm font-medium mb-6">Login to view your orders</p>
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
    <div className="min-h-screen flex flex-col relative">
      <div className="fixed inset-0 z-0" style={{ backgroundColor: "#f3f5f9" }} />
      <Header />
      <main className="flex-1 pb-24 md:pb-0 relative z-10">
        <div className="relative py-4 px-4 sm:px-6 lg:px-10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setLocation("/")}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1a1a1a] shadow-sm transition-all hover:bg-white/90"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </button>
              <button
                onClick={fetchOrders}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors"
                style={{ background: "white", boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)" }}
              >
                <RefreshCw size={14} className={`${loading ? "animate-spin" : ""}`} style={{ color: "#7b5cff" }} />
              </button>
            </div>
            <div className="mb-3">
              <p style={{ color: "#888888", fontSize: "10px", fontWeight: "500", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Your purchases
              </p>
              <h1 style={{ fontSize: "20px", fontWeight: "800", color: "#1a1a1a" }}>My Orders</h1>
            </div>
            <div className="flex rounded-full bg-white p-1 mx-2" style={{ border: "1px solid #F0F0F0" }}>
              {tabs.map(({ id, label, Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1 h-9 rounded-full font-semibold text-[10px] transition-all ${
                    tab === id ? "text-white shadow-sm" : "text-[#6B7280]"
                  }`}
                  style={
                    tab === id
                      ? { background: "linear-gradient(90deg, #7B61FF, #5B3FFF)" }
                      : { background: "transparent" }
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{label}</span>
                  {count > 0 && (
                    <span
                      className={`inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] px-1 ${
                        tab === id ? "bg-white/20" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
          {loading && (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-[88px] g-skeleton rounded-2xl" />)}</div>
          )}

          {!loading && error && (
            <div className="text-center py-16">
              <XCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
              <p className="font-bold mb-1">Failed to load</p>
              <p className="text-sm mb-4" style={{ color: "#888888" }}>Could not fetch your orders</p>
              <Button onClick={fetchOrders} className="rounded-2xl font-bold">Retry</Button>
            </div>
          )}

          {!loading && !error && (
            <>
              {tab === "payment-pending" && paymentPendingOrders.length > 0 && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                  These orders are awaiting payment. Tap{" "}
                  <span className="font-bold">Pay Now</span> to review this order and complete payment.
                </div>
              )}

              {visibleOrders.length === 0 ? (
                tab === "vouchers" ? (
                  <EmptyState icon={Tag} title="No Vouchers Yet"
                    subtitle="Your purchased vouchers will appear here after payment" />
                ) : tab === "voucher-pending" ? (
                  <EmptyState icon={Clock} title="No Orders Pending Voucher"
                    subtitle="Paid orders whose vouchers haven't been issued yet will appear here" />
                ) : (
                  <EmptyState icon={CreditCard} title="No Pending Payments"
                    subtitle="Orders where payment wasn't completed will appear here" />
                )
              ) : (
                <div className="space-y-3">
                  {visibleOrders.map(order => {
                    const key = order?.order_id || order?.order_number;
                    return (
                      <OrderRow
                        key={key}
                        order={order}
                        onViewNow={handleViewNow}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
