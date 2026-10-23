// pages/ResellerDashboard.tsx
// Reseller home: wallet + quick actions + tabbed Orders / Vouchers / Failed.
//   Orders  — GET /v1/reseller/orders; click a row for full detail
//             (GET /v1/reseller/orders/{orderNumber}, incl. credentials).
//   Vouchers— credentials aggregated from completed order details; date
//             filter; click a row for PIN / card / activation details.
//   Failed  — orders whose status is FAILED; click for detail.
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Wallet,
  ShoppingBag,
  TrendingUp,
  LogOut,
  RefreshCw,
  AlertCircle,
  Store,
  ShoppingCart,
  ChevronRight,
  Copy,
  X,
  Receipt,
  Download,
} from "lucide-react";
import {
  getResellerSession,
  clearResellerSession,
  fetchResellerWallet,
  fetchResellerOrders,
  fetchResellerOrderDetails,
  fetchResellerWalletTransactions,
  getResellerCart,
  vouchersToCsv,
  downloadTextFile,
  fetchResellerProfile,
  type ResellerOrderRow,
  type ResellerOrderResult,
  type ResellerVoucherRow,
  type ResellerWalletTransaction,
  type ResellerProfile,
} from "@/api/resellerApi";
import { useToast } from "@/hooks/use-toast";

type Tab = "orders" | "vouchers" | "failed" | "transactions";

const money = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const statusChip = (status?: string): string => {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED" || s === "COMPLETE")
    return "bg-emerald-50 text-emerald-600";
  if (s === "FAILED") return "bg-red-50 text-red-600";
  if (s === "PLACED" || s === "PROCESSING")
    return "bg-amber-50 text-amber-600";
  return "bg-gray-100 text-gray-600";
};

const shortDate = (iso?: string): string =>
  iso ? iso.slice(0, 10) : "—";

export default function ResellerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const session = getResellerSession();

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [orders, setOrders] = useState<ResellerOrderRow[]>([]);
  const [transactions, setTransactions] = useState<ResellerWalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  // Tabs
  const [tab, setTab] = useState<Tab>("orders");

  // Profile view — opened from the header avatar (replaces the logout spot).
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<ResellerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ResellerOrderResult | null>(
    null
  );
  const [selectedVoucher, setSelectedVoucher] =
    useState<ResellerVoucherRow | null>(null);

  // Vouchers tab
  const [vouchers, setVouchers] = useState<ResellerVoucherRow[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const refreshCartCount = () =>
    setCartCount(getResellerCart().reduce((s, i) => s + i.quantity, 0));

  /** Flatten credentials from completed order details into voucher rows. */
  const loadVouchers = useCallback(async (allOrders: ResellerOrderRow[]) => {
    setVouchersLoading(true);
    try {
      const completed = allOrders
        .filter((o) => o.status === "COMPLETED")
        .slice(0, 50); // safety cap; a dedicated vouchers endpoint would scale better
      const results = await Promise.allSettled(
        completed.map((o) => fetchResellerOrderDetails(o.orderNumber))
      );
      const rows: ResellerVoucherRow[] = [];
      results.forEach((res, i) => {
        if (res.status !== "fulfilled") return;
        const order = completed[i];
        for (const item of res.value.items ?? []) {
          for (const c of item.credentials ?? []) {
            rows.push({
              orderNumber: order.orderNumber,
              clientOrderRef: order.clientOrderRef,
              orderDate: order.createdAt,
              brandSku: item.brandSku,
              brandName: item.brandName,
              cardNumber: c.cardNumber,
              cardPin: c.cardPin,
              activationCode: c.activationCode,
              activationUrl: c.activationUrl,
              expiry: c.expiry,
            });
          }
        }
      });
      rows.sort((a, b) =>
        (b.orderDate || "").localeCompare(a.orderDate || "")
      );
      setVouchers(rows);
    } finally {
      setVouchersLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wallet, orderRows, txns] = await Promise.all([
        fetchResellerWallet(),
        fetchResellerOrders(),
        fetchResellerWalletTransactions(),
      ]);
      setWalletBalance(wallet.walletBalance);
      setOrders(orderRows);
      setTransactions(txns.transactions ?? []);
      void loadVouchers(orderRows);
    } catch (err) {
      const status = (err as any)?.response?.status;
      const d = (err as any)?.response?.data;
      if (status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError(
          (typeof d === "string" ? d : d?.message) ||
            "Couldn't reach reseller services. Please retry."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loadVouchers]);

  // Not logged in as a reseller — send back to the landing page to start.
  useEffect(() => {
    if (!session?.token) {
      setLocation("/reseller");
      return;
    }
    refreshCartCount();
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    clearResellerSession();
    setLocation("/reseller");
  };

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      setProfile(await fetchResellerProfile());
    } catch (err) {
      const status = (err as any)?.response?.status;
      if (status === 401) {
        setProfileError("Session expired. Please login again.");
      } else if (status === 404) {
        setProfileError(
          "Profile service isn't live yet — showing session details."
        );
      } else {
        setProfileError("Couldn't load profile details. Please retry.");
      }
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const openProfile = () => {
    setShowProfile(true);
    if (!profile && !profileLoading) void loadProfile();
  };

  const avatarInitial = (session?.clientId || "R").trim().charAt(0).toUpperCase();

  const openOrder = async (orderNumber: string) => {
    setSelectedVoucher(null);
    setSelectedOrder(null);
    try {
      const details = await fetchResellerOrderDetails(orderNumber);
      setSelectedOrder(details);
    } catch {
      toast({
        title: "Couldn't load order",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => toast({ title: `${label} copied`, duration: 1500 }))
      .catch(() => undefined);
  };

  /** Export-all: every voucher matching the current date filter. */
  const handleExportAll = () => {
    if (filteredVouchers.length === 0) {
      toast({
        title: "Nothing to export",
        description: "No vouchers match the current filter.",
        variant: "destructive",
      });
      return;
    }
    const name =
      dateFrom || dateTo
        ? `vouchers-${dateFrom || "open"}_${dateTo || "open"}.csv`
        : "vouchers.csv";
    downloadTextFile(vouchersToCsv(filteredVouchers), name);
    toast({
      title: "Export downloaded",
      description: `${filteredVouchers.length} voucher${filteredVouchers.length === 1 ? "" : "s"} · ${name}`,
      duration: 2500,
    });
  };

  /** Export-one: a single voucher from the detail view. */
  const handleExportOne = (v: ResellerVoucherRow) => {
    const tag = (v.cardNumber || v.brandSku || "voucher").slice(-6);
    const name = `voucher-${tag}.csv`;
    downloadTextFile(vouchersToCsv([v]), name);
    toast({ title: "Export downloaded", description: name, duration: 2000 });
  };

  const failedOrders = orders.filter((o) => o.status === "FAILED");
  const filteredVouchers = vouchers.filter((v) => {
    const d = (v.orderDate || "").slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  });

  const stats: { key: Tab; icon: typeof ShoppingBag; label: string; value: number }[] = [
    { key: "orders", icon: ShoppingBag, label: "Orders", value: orders.length },
    {
      key: "vouchers",
      icon: TrendingUp,
      label: "Vouchers",
      value: vouchers.length,
    },
    { key: "failed", icon: AlertCircle, label: "Failed", value: failedOrders.length },
    {
      key: "transactions",
      icon: Receipt,
      label: "Transactions",
      value: transactions.length,
    },
  ];

  /* ----------------------------------------------------------- detail views */

  if (showProfile) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <DetailHeader
          title="Profile"
          onBack={() => setShowProfile(false)}
        />
        <main className="mx-auto max-w-lg px-4 py-4 pb-10">
          {/* Identity card */}
          <div className="rounded-2xl bg-[linear-gradient(135deg,_#9747FF_0%,_#3B82F6_100%)] p-5 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/20 text-xl font-extrabold">
                {avatarInitial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">
                  {profile?.organizationName || session?.clientId || "Reseller"}
                </p>
                <p className="truncate text-[11px] opacity-80">
                  {session?.clientId}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold">
                {profile?.status ?? "ACTIVE"}
              </span>
            </div>
          </div>

          {profileLoading ? (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-gray-100"
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {profileError && (
                <div className="mt-4 flex items-start justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-700">
                  <span>{profileError}</span>
                  <button
                    onClick={() => void loadProfile()}
                    className="shrink-0 font-bold underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-bold text-gray-900">
                  Account details
                </p>
                <div className="space-y-2.5">
                  <ProfileRow
                    label="Organization"
                    value={profile?.organizationName ?? "—"}
                  />
                  <ProfileRow
                    label="Email"
                    value={profile?.contactEmail ?? "—"}
                  />
                  <ProfileRow
                    label="Mobile"
                    value={profile?.contactMobile ?? "—"}
                  />
                  <ProfileRow
                    label="Location"
                    value={
                      [profile?.city, profile?.state]
                        .filter(Boolean)
                        .join(", ") || "—"
                    }
                  />
                  <ProfileRow
                    label="Client ID"
                    value={session?.clientId ?? profile?.clientId ?? "—"}
                    mono
                  />
                  <ProfileRow
                    label="Reseller ID"
                    value={session?.resellerId ?? profile?.resellerId ?? "—"}
                    mono
                  />
                  <ProfileRow
                    label="Wallet balance"
                    value={money(walletBalance ?? 0)}
                  />
                  <ProfileRow label="Status" value={profile?.status ?? "ACTIVE"} />
                  {profile?.pan && <ProfileRow label="PAN" value={profile.pan} mono />}
                  {profile?.gst && <ProfileRow label="GST" value={profile.gst} mono />}
                  {profile?.createdAt && (
                    <ProfileRow
                      label="Member since"
                      value={profile.createdAt.slice(0, 10)}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Logout lives inside the profile view now */}
          <button
            onClick={handleLogout}
            className="mx-auto mt-6 flex h-11 w-full max-w-[240px] items-center justify-center gap-2 rounded-full bg-[linear-gradient(90deg,#f06da6_0%,#755ff0_100%)] text-sm font-bold text-white shadow transition-all active:scale-95"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
            Logout
          </button>
        </main>
      </div>
    );
  }

  if (selectedOrder) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <DetailHeader
          title="Order details"
          onBack={() => setSelectedOrder(null)}
          onProfile={openProfile}
          avatarInitial={avatarInitial}
        />
        <main className="mx-auto max-w-lg px-4 py-4 pb-10">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {selectedOrder.clientOrderRef || selectedOrder.orderNumber}
                </p>
                <p className="text-[11px] text-gray-500">
                  {selectedOrder.orderNumber}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusChip(selectedOrder.status)}`}
              >
                {selectedOrder.status}
              </span>
            </div>
            <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-600">
              <Row label="Total charged" value={money(Number(selectedOrder.totalAmount))} />
              <Row
                label="Discount"
                value={
                  Number(selectedOrder.discountAmount) > 0
                    ? `−${money(Number(selectedOrder.discountAmount))}`
                    : "—"
                }
              />
            </div>
          </div>

          {(selectedOrder.items ?? []).map((item) => (
            <div
              key={item.itemId}
              className="mt-3 rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {item.brandName}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {item.brandSku} · {item.quantity} × {money(Number(item.unitPrice))}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusChip(item.fulfillmentStatus)}`}
                >
                  {item.fulfillmentStatus}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                <Row label="Net amount" value={money(Number(item.netAmount))} />
                {Number(item.discountPercent) > 0 && (
                  <Row
                    label="Discount"
                    value={`${item.discountPercent}% (−${money(Number(item.discountAmount))})`}
                  />
                )}
              </div>
              {(item.credentials ?? []).map((cred, ci) => (
                <div
                  key={ci}
                  className="mt-3 rounded-xl border border-purple-100 bg-purple-50/50 p-3"
                >
                  <CredentialRows cred={cred} onCopy={copy} />
                </div>
              ))}
            </div>
          ))}
        </main>
      </div>
    );
  }

  if (selectedVoucher) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <DetailHeader
          title="Voucher details"
          onBack={() => setSelectedVoucher(null)}
          onProfile={openProfile}
          avatarInitial={avatarInitial}
        />
        <main className="mx-auto max-w-lg px-4 py-4 pb-10">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-base font-bold text-gray-900">
              {selectedVoucher.brandName}
            </p>
            <p className="text-[11px] text-gray-500">
              {selectedVoucher.brandSku}
            </p>
            <div className="mt-4 space-y-2.5">
              <CopyRow
                label="Card number"
                value={selectedVoucher.cardNumber}
                onCopy={copy}
              />
              <CopyRow label="PIN" value={selectedVoucher.cardPin} onCopy={copy} />
              <CopyRow
                label="Activation code"
                value={selectedVoucher.activationCode}
                onCopy={copy}
              />
              <Row label="Expiry" value={selectedVoucher.expiry?.slice(0, 10) ?? "—"} />
              <Row
                label="Order"
                value={`${selectedVoucher.clientOrderRef || selectedVoucher.orderNumber}`}
              />
              <Row label="Order date" value={shortDate(selectedVoucher.orderDate)} />
            </div>
            <button
              onClick={() => handleExportOne(selectedVoucher)}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full border border-purple-300 bg-white text-sm font-bold text-purple-700 transition-all active:scale-95"
            >
              <Download className="h-4 w-4" />
              Download voucher (CSV)
            </button>
            {selectedVoucher.activationUrl && (
              <a
                href={selectedVoucher.activationUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-bold text-white shadow active:scale-95"
              >
                Open activation link
              </a>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ----------------------------------------------------------- dashboard */

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Top bar */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/reseller")}
              className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold leading-tight text-gray-900">
                Reseller Dashboard
              </h1>
              <p className="max-w-[190px] truncate text-[11px] text-gray-500">
                {session?.clientId || "Reseller"}
              </p>
            </div>
          </div>
          <ProfileAvatar onClick={openProfile} initial={avatarInitial} />
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-4 pb-10">
        {error ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Dashboard unavailable
            </p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2 text-xs font-semibold text-white shadow transition-all hover:shadow-md active:scale-95"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
              {error.includes("Session expired") && (
                <button
                  onClick={handleLogout}
                  className="rounded-full bg-gray-100 px-5 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                >
                  Login again
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Wallet card */}
            <section className="rounded-2xl bg-[linear-gradient(135deg,_#9747FF_0%,_#3B82F6_100%)] p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 text-xs font-medium opacity-90">
                <Wallet className="h-4 w-4" />
                Wallet Balance
              </div>
              <p className="mt-2 text-3xl font-extrabold tabular-nums">
                {loading ? (
                  <span className="inline-block h-8 w-32 animate-pulse rounded bg-white/25" />
                ) : (
                  <>
                    ₹
                    {(walletBalance ?? 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] opacity-80">
                INR · available for voucher purchases
              </p>
            </section>

            {/* Quick actions */}
            <section className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocation("/reseller/catalog")}
                className="flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-purple-700 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all active:scale-95"
              >
                <Store className="h-4 w-4" />
                Browse Brands
              </button>
              <button
                onClick={() => setLocation("/reseller/cart")}
                className="relative flex items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-bold text-purple-700 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all active:scale-95"
              >
                <ShoppingCart className="h-4 w-4" />
                Cart
                {cartCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </button>
            </section>

            {/* Stats — Orders / Vouchers / Failed / Transactions (tab switchers) */}
            <section className="mt-4 grid grid-cols-4 gap-2">
              {stats.map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => {
                    setTab(stat.key);
                    setSelectedOrder(null);
                    setSelectedVoucher(null);
                  }}
                  className={`rounded-xl p-2.5 text-center shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all active:scale-95 ${
                    tab === stat.key
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                      : "bg-white text-gray-900"
                  }`}
                >
                  <div
                    className={`mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                      tab === stat.key ? "bg-white/20" : "bg-purple-50"
                    }`}
                  >
                    <stat.icon
                      className={`h-4 w-4 ${tab === stat.key ? "text-white" : "text-purple-600"}`}
                    />
                  </div>
                  <p className="text-lg font-extrabold leading-tight tabular-nums">
                    {loading ? (
                      <span
                        className={`inline-block h-5 w-8 animate-pulse rounded ${
                          tab === stat.key ? "bg-white/30" : "bg-gray-100"
                        }`}
                      />
                    ) : (
                      stat.value
                    )}
                  </p>
                  <p
                    className={`text-[10px] font-medium leading-tight ${
                      tab === stat.key ? "text-white/90" : "text-gray-500"
                    }`}
                  >
                    {stat.label}
                  </p>
                </button>
              ))}
            </section>

            {/* Tab content */}
            <section className="mt-5">
              {tab === "orders" && (
                <TabList title="All orders">
                  {orders.length === 0 ? (
                    <Empty text="No orders yet" />
                  ) : (
                    <div className="space-y-2">
                      {orders.map((o) => (
                        <OrderRow key={o.orderNumber} order={o} onOpen={openOrder} />
                      ))}
                    </div>
                  )}
                </TabList>
              )}

              {tab === "vouchers" && (
                <TabList
                  title="Vouchers"
                  action={
                    <button
                      onClick={handleExportAll}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-purple-700 shadow ring-1 ring-purple-200 transition-all active:scale-95"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export all
                    </button>
                  }
                >
                  {/* Date filter */}
                  <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="mb-1 text-[10px] font-semibold text-gray-500">
                          From
                        </p>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="h-9 w-full rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-purple-500"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="mb-1 text-[10px] font-semibold text-gray-500">
                          To
                        </p>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="h-9 w-full rounded-lg border border-gray-200 px-2 text-xs outline-none focus:border-purple-500"
                        />
                      </div>
                      {(dateFrom || dateTo) && (
                        <button
                          onClick={() => {
                            setDateFrom("");
                            setDateTo("");
                          }}
                          className="mt-5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                          aria-label="Clear date filter"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                      {vouchersLoading
                        ? "Loading vouchers..."
                        : `${filteredVouchers.length} voucher${filteredVouchers.length === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  {vouchersLoading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-14 animate-pulse rounded-xl bg-white shadow-sm"
                        />
                      ))}
                    </div>
                  ) : filteredVouchers.length === 0 ? (
                    <Empty
                      text={
                        dateFrom || dateTo
                          ? "No vouchers in this date range"
                          : "No vouchers yet"
                      }
                    />
                  ) : (
                    <div className="space-y-2">
                      {filteredVouchers.map((v, i) => (
                        <button
                          key={`${v.orderNumber}-${v.cardNumber ?? i}`}
                          onClick={() => setSelectedVoucher(v)}
                          className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all active:scale-[0.99]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-gray-900">
                              {v.brandName}
                            </p>
                            <p className="truncate text-[10px] text-gray-500">
                              {v.cardNumber
                                ? `•••• ${v.cardNumber.slice(-4)}`
                                : v.brandSku}{" "}
                              · {shortDate(v.orderDate)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1 text-[10px] text-gray-400">
                            {v.cardPin ? "PIN" : ""}
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </TabList>
              )}

              {tab === "failed" && (
                <TabList title="Failed orders">
                  {failedOrders.length === 0 ? (
                    <Empty text="No failed orders — nice!" />
                  ) : (
                    <div className="space-y-2">
                      {failedOrders.map((o) => (
                        <OrderRow key={o.orderNumber} order={o} onOpen={openOrder} />
                      ))}
                    </div>
                  )}
                </TabList>
              )}

              {tab === "transactions" && (
                <TabList title="Transactions">
                  {loading ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-14 animate-pulse rounded-xl bg-white shadow-sm"
                        />
                      ))}
                    </div>
                  ) : transactions.length === 0 ? (
                    <Empty text="No transactions yet" />
                  ) : (
                    <div className="space-y-2">
                      {transactions.map((t) => (
                        <TransactionRow key={t.id} transaction={t} />
                      ))}
                    </div>
                  )}
                </TabList>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------- components */

function ProfileAvatar({
  onClick,
  initial,
}: {
  onClick: () => void;
  initial: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label="Profile"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-xs font-bold text-white shadow-sm ring-2 ring-white transition-all active:scale-95"
    >
      {initial}
    </button>
  );
}

function DetailHeader({
  title,
  onBack,
  onProfile,
  avatarInitial,
}: {
  title: string;
  onBack: () => void;
  onProfile?: () => void;
  avatarInitial?: string;
}) {
  return (
    <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">{title}</h1>
        </div>
        {onProfile && (
          <ProfileAvatar onClick={onProfile} initial={avatarInitial || "R"} />
        )}
      </div>
    </nav>
  );
}

function TabList({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white p-6 text-center shadow-sm">
      <p className="text-xs font-semibold text-gray-700">{text}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-semibold text-gray-800 tabular-nums">{value}</span>
    </div>
  );
}

function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value?: string;
  onCopy: (text: string, label: string) => void;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-sm font-semibold text-gray-900">
          {value}
        </span>
        <button
          onClick={() => onCopy(value, label)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );
}

function CredentialRows({
  cred,
  onCopy,
}: {
  cred: {
    cardNumber?: string;
    cardPin?: string;
    activationCode?: string;
    activationUrl?: string;
    expiry?: string;
  };
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <CopyRow label="Card no." value={cred.cardNumber} onCopy={onCopy} />
      <CopyRow label="PIN" value={cred.cardPin} onCopy={onCopy} />
      <CopyRow label="Code" value={cred.activationCode} onCopy={onCopy} />
      {cred.expiry && (
        <Row label="Expiry" value={cred.expiry.slice(0, 10)} />
      )}
      {cred.activationUrl && (
        <a
          href={cred.activationUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-block pt-1 text-[11px] font-semibold text-purple-700 underline"
        >
          Open activation link
        </a>
      )}
    </div>
  );
}

const txnChip = (type: string): string => {
  switch ((type || "").toUpperCase()) {
    case "CREDIT":
      return "bg-emerald-50 text-emerald-600";
    case "DEBIT":
      return "bg-red-50 text-red-600";
    case "REFUND":
      return "bg-blue-50 text-blue-600";
    case "DISCOUNT":
      return "bg-purple-50 text-purple-600";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

function ProfileRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-gray-500">{label}</span>
      <span
        className={`min-w-0 break-all text-right text-xs font-semibold text-gray-900 ${
          mono ? "font-mono text-[11px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: ResellerWalletTransaction;
}) {
  const isCredit =
    transaction.type === "CREDIT" || transaction.type === "REFUND";
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-[0px_4px_12px_rgba(0,0,0,0.06)]">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${txnChip(transaction.type)}`}
          >
            {transaction.type}
          </span>
          <p className="truncate text-xs font-semibold text-gray-900">
            {transaction.reference || "Wallet transaction"}
          </p>
        </div>
        <p className="mt-0.5 text-[10px] text-gray-500">
          {transaction.createdAt.replace("T", " ").slice(0, 16)} · balance{" "}
          {money(Number(transaction.balanceAfter))}
        </p>
      </div>
      <p
        className={`shrink-0 text-sm font-extrabold tabular-nums ${
          isCredit ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {isCredit ? "+" : "−"}
        {money(Number(transaction.amount))}
      </p>
    </div>
  );
}

function OrderRow({
  order,
  onOpen,
}: {
  order: ResellerOrderRow;
  onOpen: (orderNumber: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(order.orderNumber)}
      className="flex w-full items-center justify-between rounded-xl bg-white px-4 py-3 text-left shadow-[0px_4px_12px_rgba(0,0,0,0.06)] transition-all active:scale-[0.99]"
    >
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-gray-900">
          {order.clientOrderRef || order.orderNumber}
        </p>
        <p className="truncate text-[10px] text-gray-500">
          {order.orderNumber} · {shortDate(order.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <p className="text-xs font-bold text-gray-900 tabular-nums">
            {money(Number(order.totalAmount))}
          </p>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusChip(order.status)}`}
          >
            {order.status}
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300" />
      </div>
    </button>
  );
}
