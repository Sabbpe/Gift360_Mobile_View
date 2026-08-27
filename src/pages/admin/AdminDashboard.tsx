// src/pages/Admin/AdminDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import AdminLogin from "./AdminLogin";
import {
  fetchSummary,
  fetchOrders,
  fetchBrandStats,
  fetchCustomerStats,
  fetchCustomerJourney,
  fetchSuperCoinTrend,
  fetchRetentionTrend,
  fetchErrorBreakdown,
  fetchGeography,
  fetchAbandonedCarts,
  fetchCartsSummary,
  fetchCartsByCustomer,
  fetchCartsByBrand,
  downloadCsv,
  ADMIN_KEY_STORAGE,
  fetchMisMaster,
  fetchMisCustomerSaving,
  fetchMdrRates,
  updateMdrRates,
  fetchVdWallet,
  logVdWalletTopup,
  fetchMisThresholds,
  updateMisThresholds,
} from "@/api/adminApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

const COLORS = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function StatCard({
  label,
  value,
  prefix = "",
}: {
  label: string;
  value: number | string;
  prefix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-[#6B7280] mb-1">{label}</div>
        <div className="text-xl font-bold text-[#111827]">
          {prefix}
          {typeof value === "number" ? value.toLocaleString("en-IN") : value}
        </div>
      </CardContent>
    </Card>
  );
}

function DateRangeBar({
  from,
  to,
  setFrom,
  setTo,
  onApply,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 mb-4">
      <div>
        <div className="text-xs text-[#6B7280] mb-1">From</div>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div>
        <div className="text-xs text-[#6B7280] mb-1">To</div>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button onClick={onApply}>Apply</Button>
    </div>
  );
}

function sumField(rows: any[], field: string): number {
  return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function DownloadButton({ rows, filename }: { rows: any[]; filename: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={!rows || rows.length === 0}
      onClick={() => downloadCsv(rows, filename)}
    >
      <Download className="h-3.5 w-3.5" />
      Download CSV
    </Button>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(
    () => !!sessionStorage.getItem(ADMIN_KEY_STORAGE)
  );

  const [from, setFrom] = useState(daysAgoISO(30));
  const [to, setTo] = useState(todayISO());

  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [superCoins, setSuperCoins] = useState<any[]>([]);
  const [retention, setRetention] = useState<any[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [geography, setGeography] = useState<any[]>([]);
  const [abandonedSummary, setAbandonedSummary] = useState<any[]>([]);
  const [abandonedDetails, setAbandonedDetails] = useState<any[]>([]);
  const [cartsSummary, setCartsSummary] = useState<any>(null);
  const [cartsByCustomer, setCartsByCustomer] = useState<any[]>([]);
  const [cartsByBrand, setCartsByBrand] = useState<any[]>([]);
  const [misMaster, setMisMaster] = useState<any>(null);
  const [misCustomerSaving, setMisCustomerSaving] = useState<any>(null);
  const [mdrRates, setMdrRates] = useState<any>(null);
  const [vdWallet, setVdWallet] = useState<any>(null);
  const [misThresholds, setMisThresholds] = useState<any>(null);
  const [thresholdFormOpen, setThresholdFormOpen] = useState(false);
  const [thresholdFormSaving, setThresholdFormSaving] = useState(false);
  const [thresholdForm, setThresholdForm] = useState({
    highMarginPct: "5",
    lowMarginPct: "3",
    highVolumeCount: "50",
  });
  const [mdrFormOpen, setMdrFormOpen] = useState(false);
  const [mdrFormSaving, setMdrFormSaving] = useState(false);
  const [mdrForm, setMdrForm] = useState({
    upiRate: "0.52",
    debitRate: "1.00",
    creditRate: "2.20",
    mobileWalletRate: "0.50",
    netbankingRate: "0.10",
  });
  const [topupFormOpen, setTopupFormOpen] = useState(false);
  const [topupFormSaving, setTopupFormSaving] = useState(false);
  const [topupForm, setTopupForm] = useState({
    topupDate: todayISO(),
    amount: "",
  });
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyData, setJourneyData] = useState<{ profile: any; timeline: any[] } | null>(null);
  const [cartStaleFilter, setCartStaleFilter] = useState(0);

  const [orderPage, setOrderPage] = useState(0);
  const [customerPage, setCustomerPage] = useState(0);
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<
    "" | "generated" | "failed"
  >("");
  const [brandFilter, setBrandFilter] = useState("");

  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);

    // Each fetch is isolated -- one endpoint failing (a bad query, a
    // transient 500, anything) must never blank out the tabs that
    // succeeded. Tonight's incident: fetchCustomerStats threw, which with
    // the old Promise.all([...]) pattern silently discarded results from
    // orders/summary/brands/supercoins too, even though those requests had
    // already succeeded -- Promise.all is all-or-nothing. This helper
    // catches and logs per-call instead, so a single broken tab stays
    // broken (with a console error to diagnose) while everything else
    // still renders normally.
    const safeLoad = async <T,>(
      label: string,
      fn: () => Promise<T>,
      onSuccess: (data: T) => void
    ) => {
      try {
        const data = await fn();
        onSuccess(data);
      } catch (err) {
        console.error(`Admin dashboard: failed to load ${label}:`, err);
      }
    };

    await Promise.allSettled([
      safeLoad("summary", () => fetchSummary({ from, to }), setSummary),
      safeLoad(
        "orders",
        () =>
          fetchOrders({
            from,
            to,
            page: orderPage,
            size: 50,
            voucherStatus: voucherStatusFilter || undefined,
            brandCode: brandFilter || undefined,
          }),
        (o) => setOrders(o.data ?? [])
      ),
      safeLoad("brands", () => fetchBrandStats({ from, to }), (b) => setBrands(b.data ?? [])),
      safeLoad(
        "customers",
        () => fetchCustomerStats({ from, to, page: customerPage, size: 50 }),
        (c) => setCustomers(c.data ?? [])
      ),
      safeLoad(
        "supercoins",
        () => fetchSuperCoinTrend({ from, to }),
        (sc) => setSuperCoins(sc.data ?? [])
      ),
      safeLoad(
        "retention",
        () => fetchRetentionTrend({ from, to }),
        (r) => setRetention(r.data ?? [])
      ),
      safeLoad(
        "errors",
        () => fetchErrorBreakdown({ from, to }),
        (e) => setErrors(e.data ?? [])
      ),
      safeLoad(
        "geography",
        () => fetchGeography({ from, to }),
        (g) => setGeography(g.data ?? [])
      ),
      safeLoad(
        "abandoned carts",
        () => fetchAbandonedCarts({ from, to, page: 0, size: 100 }),
        (a) => {
          setAbandonedSummary(a.summary ?? []);
          setAbandonedDetails(a.data ?? []);
        }
      ),
      safeLoad("carts summary", () => fetchCartsSummary(), setCartsSummary),
      safeLoad(
        "carts by customer",
        () => fetchCartsByCustomer({ minStaleHours: cartStaleFilter, page: 0, size: 100 }),
        (c) => setCartsByCustomer(c.data ?? [])
      ),
      safeLoad("carts by brand", () => fetchCartsByBrand(), (c) => setCartsByBrand(c.data ?? [])),
      safeLoad("mis master", () => fetchMisMaster({ from, to }), setMisMaster),
      safeLoad("mis customer saving", () => fetchMisCustomerSaving({ from, to }), setMisCustomerSaving),
      safeLoad("mdr rates", () => fetchMdrRates(), setMdrRates),
      safeLoad("vd wallet", () => fetchVdWallet({ from, to }), setVdWallet),
      safeLoad("mis thresholds", () => fetchMisThresholds(), setMisThresholds),
    ]);

    setLoading(false);
  }, [from, to, orderPage, customerPage, voucherStatusFilter, brandFilter, cartStaleFilter]);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

  const handleMdrSubmit = useCallback(async () => {
    setMdrFormSaving(true);
    try {
      await updateMdrRates({
        upiRate: Number(mdrForm.upiRate),
        debitRate: Number(mdrForm.debitRate),
        creditRate: Number(mdrForm.creditRate),
        mobileWalletRate: Number(mdrForm.mobileWalletRate),
        netbankingRate: Number(mdrForm.netbankingRate),
        enteredBy: "admin",
      });
      setMdrFormOpen(false);
      const fresh = await fetchMdrRates();
      setMdrRates(fresh);
      const freshMaster = await fetchMisMaster({ from, to });
      setMisMaster(freshMaster);
    } catch (err) {
      console.error("Failed to update MDR rates:", err);
    } finally {
      setMdrFormSaving(false);
    }
  }, [mdrForm, from, to]);

  const handleTopupSubmit = useCallback(async () => {
    if (!topupForm.amount || Number(topupForm.amount) <= 0) return;
    setTopupFormSaving(true);
    try {
      await logVdWalletTopup({
        topupDate: topupForm.topupDate,
        amount: Number(topupForm.amount),
        enteredBy: "admin",
      });
      setTopupFormOpen(false);
      setTopupForm({ topupDate: todayISO(), amount: "" });
      const fresh = await fetchVdWallet({ from, to });
      setVdWallet(fresh);
    } catch (err) {
      console.error("Failed to log VD wallet topup:", err);
    } finally {
      setTopupFormSaving(false);
    }
  }, [topupForm, from, to]);

  const handleThresholdSubmit = useCallback(async () => {
    setThresholdFormSaving(true);
    try {
      await updateMisThresholds({
        highMarginPct: Number(thresholdForm.highMarginPct),
        lowMarginPct: Number(thresholdForm.lowMarginPct),
        highVolumeCount: Number(thresholdForm.highVolumeCount),
        enteredBy: "admin",
      });
      setThresholdFormOpen(false);
      const fresh = await fetchMisThresholds();
      setMisThresholds(fresh);
      const freshMaster = await fetchMisMaster({ from, to });
      setMisMaster(freshMaster);
    } catch (err) {
      console.error("Failed to update MIS thresholds:", err);
    } finally {
      setThresholdFormSaving(false);
    }
  }, [thresholdForm, from, to]);

  const openCustomerJourney = useCallback(async (clientId: string) => {
    setJourneyOpen(true);
    setJourneyLoading(true);
    setJourneyData(null);
    try {
      const data = await fetchCustomerJourney({ clientId });
      setJourneyData(data);
    } catch (err) {
      console.error("Customer journey load failed:", err);
    } finally {
      setJourneyLoading(false);
    }
  }, []);

  const [customersCsvLoading, setCustomersCsvLoading] = useState(false);

  const downloadAllCustomersCsv = useCallback(async () => {
    // The on-screen `customers` state is always just the current page (50
    // rows) -- CSV export should be the full list, not whatever page the
    // user happens to be viewing. Fetches fresh with a generously large
    // page size rather than reusing the paginated state.
    setCustomersCsvLoading(true);
    try {
      const all = await fetchCustomerStats({ from, to, page: 0, size: 100000 });
      downloadCsv(all.data ?? [], "gift360-customers.csv");
    } catch (err) {
      console.error("Failed to export full customer list:", err);
    } finally {
      setCustomersCsvLoading(false);
    }
  }, [from, to]);

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#111827]">
            Gift360 Admin Dashboard
          </h1>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.removeItem(ADMIN_KEY_STORAGE);
              setAuthed(false);
            }}
          >
            Log out
          </Button>
        </div>

        <DateRangeBar
          from={from}
          to={to}
          setFrom={setFrom}
          setTo={setTo}
          onApply={loadAll}
        />

        <Tabs defaultValue="overview">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="brands">Brand-wise</TabsTrigger>
            <TabsTrigger value="customers">Customer-wise</TabsTrigger>
            <TabsTrigger value="supercoins">SuperCoins</TabsTrigger>
            <TabsTrigger value="retention">Retention</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
            <TabsTrigger value="currentcarts">Current Carts</TabsTrigger>
            <TabsTrigger value="mis">MIS</TabsTrigger>
          </TabsList>

          {/* ================= OVERVIEW ================= */}
          <TabsContent value="overview">
            {summary && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Total Orders" value={summary.total_orders} />
                  <StatCard label="Paid Orders" value={summary.total_paid_orders} />
                  <StatCard
                    label="Total Revenue"
                    value={Number(summary.total_revenue).toLocaleString("en-IN")}
                    prefix="₹"
                  />
                  <StatCard
                    label="Unique Customers"
                    value={summary.unique_customers}
                  />
                  <StatCard
                    label="Vouchers Generated"
                    value={summary.vouchers_generated}
                  />
                  <StatCard
                    label="Vouchers Failed"
                    value={summary.vouchers_failed}
                  />
                  <StatCard label="Scratched" value={summary.total_scratched} />
                  <StatCard label="Gifted" value={summary.total_gifted} />
                  <StatCard
                    label="SuperCoins Earned"
                    value={Number(summary.supercoins_earned)}
                  />
                  <StatCard
                    label="SuperCoins Burnt"
                    value={summary.supercoins_burnt}
                  />
                  <StatCard
                    label="≈ ₹ Value of Coins Burnt"
                    value={`₹${summary.supercoins_burnt_value_inr_approx}`}
                  />
                  <StatCard
                    label="SuperCoins Held (abandoned/failed, will auto-release)"
                    value={summary.supercoins_held_not_burnt}
                  />
                  <StatCard
                    label="⚠ Genuine Open Risk (paid, no voucher, unrefunded)"
                    value={summary.supercoins_unresolved_risk}
                  />
                  <StatCard
                    label="SuperCoins Refunded"
                    value={summary.supercoins_refunded}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Voucher Generation Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "Generated",
                                value: summary.vouchers_generated,
                              },
                              { name: "Failed", value: summary.vouchers_failed },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#EF4444" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">
                        Top Brands by Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={brands.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="brand_name"
                            tick={{ fontSize: 10 }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total_revenue" fill="#7C3AED" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ================= ORDERS ================= */}
          <TabsContent value="orders">
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={voucherStatusFilter}
                onChange={(e) => {
                  setVoucherStatusFilter(e.target.value as any);
                  setOrderPage(0);
                }}
              >
                <option value="">All voucher statuses</option>
                <option value="generated">Voucher generated</option>
                <option value="failed">Voucher failed</option>
              </select>
              <Input
                placeholder="Filter by brand code (e.g. EGVGBNQSC001)"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={loadAll}>Filter</Button>
              <DownloadButton rows={orders} filename="gift360-orders.csv" />
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Ref</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Payment Status</TableHead>
                      <TableHead>Voucher Status</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Scratched</TableHead>
                      <TableHead>Gifted</TableHead>
                      <TableHead>SC Earned</TableHead>
                      <TableHead>SC Redeemed</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o, i) => (
                      <TableRow key={`${o.order_item_id}-${i}`}>
                        <TableCell className="font-mono text-xs">
                          {o.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{o.client_name}</div>
                          <div className="text-xs text-[#6B7280]">
                            {o.client_email}
                          </div>
                        </TableCell>
                        <TableCell>{o.brand_name}</TableCell>
                        <TableCell>
                          ₹{Number(o.line_total ?? o.total_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {o.payment_ref}
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.payment_mode ?? "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              o.payment_status === "SUCCESS"
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {o.payment_status ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              o.voucher_status === "GENERATED"
                                ? "text-green-600 font-medium"
                                : o.voucher_status === "FAILED"
                                ? "text-red-600 font-medium"
                                : "text-[#9CA3AF]"
                            }
                          >
                            {o.voucher_status === "GENERATED"
                              ? "Generated"
                              : o.voucher_status === "FAILED"
                              ? "Failed"
                              : o.voucher_status === "NOT_APPLICABLE_PENDING"
                              ? "Pending"
                              : "N/A (never paid)"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.last_evc_response_code ? (
                            <span className="text-red-600 font-mono">
                              {o.last_evc_response_code}
                              {o.last_evc_response_msg
                                ? ` — ${o.last_evc_response_msg}`
                                : ""}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{o.is_scratched ? "Yes" : "No"}</TableCell>
                        <TableCell>{o.is_gift ? "Yes" : "No"}</TableCell>
                        <TableCell>{o.coins_earned ?? 0}</TableCell>
                        <TableCell>{o.coins_redeemed ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          {o.created_at
                            ? new Date(o.created_at).toLocaleString("en-IN")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">
                        Total ({orders.length} rows shown)
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(orders, "line_total"))}
                      </TableCell>
                      <TableCell colSpan={4} />
                      <TableCell className="font-medium">
                        {sumField(orders, "coins_earned").toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(orders, "coins_redeemed")}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-3">
              <Button
                variant="outline"
                disabled={orderPage === 0}
                onClick={() => setOrderPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-[#6B7280]">Page {orderPage + 1}</span>
              <Button variant="outline" onClick={() => setOrderPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </TabsContent>

          {/* ================= BRANDS ================= */}
          <TabsContent value="brands">
            <div className="flex justify-end mb-3">
              <DownloadButton rows={brands} filename="gift360-brands.csv" />
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Total Items</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Vouchers Generated</TableHead>
                      <TableHead>Vouchers Failed</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Scratched</TableHead>
                      <TableHead>Gifted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((b, i) => {
                      const total =
                        Number(b.vouchers_generated) + Number(b.vouchers_failed);
                      const rate = total
                        ? ((Number(b.vouchers_generated) / total) * 100).toFixed(1)
                        : "—";
                      return (
                        <TableRow key={i}>
                          <TableCell>{b.brand_name}</TableCell>
                          <TableCell>{b.total_items}</TableCell>
                          <TableCell>
                            ₹{Number(b.total_revenue).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-green-600">
                            {b.vouchers_generated}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {b.vouchers_failed}
                          </TableCell>
                          <TableCell>{rate}%</TableCell>
                          <TableCell>{b.total_scratched}</TableCell>
                          <TableCell>{b.total_gifted}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total ({brands.length} brands)
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(brands, "total_items")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(brands, "total_revenue"))}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {sumField(brands, "vouchers_generated")}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        {sumField(brands, "vouchers_failed")}
                      </TableCell>
                      <TableCell />
                      <TableCell className="font-medium">
                        {sumField(brands, "total_scratched")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(brands, "total_gifted")}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= CUSTOMERS ================= */}
          <TabsContent value="customers">
            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={customersCsvLoading}
                onClick={downloadAllCustomersCsv}
              >
                <Download className="h-3.5 w-3.5" />
                {customersCsvLoading ? "Preparing full export…" : "Download CSV (all customers)"}
              </Button>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Vouchers Received</TableHead>
                      <TableHead>SC Earned</TableHead>
                      <TableHead>SC Burnt</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Last Order</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="text-sm">{c.client_name}</div>
                          <div className="text-xs text-[#6B7280]">
                            {c.client_email}
                          </div>
                        </TableCell>
                        <TableCell>{c.client_mobile}</TableCell>
                        <TableCell>{c.total_orders}</TableCell>
                        <TableCell>
                          ₹{Number(c.total_spent).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{c.vouchers_received}</TableCell>
                        <TableCell>{Number(c.supercoins_earned)}</TableCell>
                        <TableCell>{c.supercoins_burnt}</TableCell>
                        <TableCell className="text-xs">
                          {c.feedback_count > 0 ? (
                            <div>
                              <div>
                                Overall {c.avg_overall ?? "—"} / NPS {c.avg_nps ?? "—"}
                              </div>
                              <div className="text-[#6B7280]">
                                ({c.feedback_count} response{c.feedback_count > 1 ? "s" : ""})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF]">No feedback</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.last_order_at
                            ? new Date(c.last_order_at).toLocaleDateString("en-IN")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCustomerJourney(c.client_id)}
                          >
                            View Journey
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total ({customers.length} customers)
                      </TableCell>
                      <TableCell />
                      <TableCell className="font-medium">
                        {sumField(customers, "total_orders")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(customers, "total_spent"))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(customers, "vouchers_received")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(customers, "supercoins_earned").toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(customers, "supercoins_burnt")}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mt-3">
              <Button
                variant="outline"
                disabled={customerPage === 0}
                onClick={() => setCustomerPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-[#6B7280]">Page {customerPage + 1}</span>
              <Button variant="outline" onClick={() => setCustomerPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </TabsContent>

          {/* ================= SUPERCOINS ================= */}
          <TabsContent value="supercoins">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  SuperCoins Earned vs Redeemed (Daily)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={superCoins}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="earned"
                      stroke="#10B981"
                      name="Earned"
                    />
                    <Line
                      type="monotone"
                      dataKey="burnt"
                      stroke="#3B82F6"
                      name="Burnt"
                    />
                    <Line
                      type="monotone"
                      dataKey="held_not_burnt"
                      stroke="#9CA3AF"
                      name="Held (not yet burnt)"
                    />
                    <Line
                      type="monotone"
                      dataKey="refunded"
                      stroke="#F59E0B"
                      name="Refunded"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Burnt</TableHead>
                      <TableHead>Held (not yet burnt)</TableHead>
                      <TableHead>Refunded</TableHead>
                      <TableHead>Orders That Burnt SC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {superCoins.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.day}</TableCell>
                        <TableCell>{Number(s.earned)}</TableCell>
                        <TableCell>{s.burnt}</TableCell>
                        <TableCell>{s.held_not_burnt}</TableCell>
                        <TableCell>{s.refunded}</TableCell>
                        <TableCell>{s.orders_that_burnt_supercoins}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= RETENTION ================= */}
          <TabsContent value="retention">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Retention (Daily)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-[#6B7280] mb-3">
                  Cashback flow: discount% × voucher value. Standard (neither
                  cashback nor SuperCoins): 2× that value. SuperCoins method:
                  coins earned × ₹0.75. Only orders with a genuinely issued
                  voucher are counted.
                </div>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={retention}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="retention"
                      stroke="#7C3AED"
                      name="Total Retention"
                    />
                    <Line
                      type="monotone"
                      dataKey="retention_cashback"
                      stroke="#EF4444"
                      name="Cashback Flow"
                    />
                    <Line
                      type="monotone"
                      dataKey="retention_supercoins"
                      stroke="#3B82F6"
                      name="SuperCoins Method"
                    />
                    <Line
                      type="monotone"
                      dataKey="retention_standard"
                      stroke="#10B981"
                      name="Standard"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Total Retention</TableHead>
                      <TableHead>Cashback (₹ / orders)</TableHead>
                      <TableHead>SuperCoins (₹ / orders)</TableHead>
                      <TableHead>Standard (₹ / orders)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retention.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.day}</TableCell>
                        <TableCell className="font-medium">
                          ₹{Number(r.retention).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          ₹{Number(r.retention_cashback).toLocaleString("en-IN")}
                          {" / "}
                          {r.cashback_orders}
                        </TableCell>
                        <TableCell>
                          ₹{Number(r.retention_supercoins).toLocaleString("en-IN")}
                          {" / "}
                          {r.supercoins_orders}
                        </TableCell>
                        <TableCell>
                          ₹{Number(r.retention_standard).toLocaleString("en-IN")}
                          {" / "}
                          {r.standard_orders}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total ({retention.length} days)
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(retention, "retention"))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(retention, "retention_cashback"))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(retention, "retention_supercoins"))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(retention, "retention_standard"))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= ERRORS ================= */}
          <TabsContent value="errors">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Voucher Failures by ValueDesign Response Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={Object.values(
                      errors.reduce((acc: any, e: any) => {
                        const key = e.response_code ?? "unknown";
                        if (!acc[key]) {
                          acc[key] = { response_code: key, failure_count: 0 };
                        }
                        acc[key].failure_count += Number(e.failure_count);
                        return acc;
                      }, {})
                    )}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="response_code" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="failure_count" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Response Code</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Failure Count</TableHead>
                      <TableHead>Amount Stuck</TableHead>
                      <TableHead>Most Recent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-red-600">
                          {e.response_code}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.response_msg || "—"}
                        </TableCell>
                        <TableCell>{e.brand_name}</TableCell>
                        <TableCell>{e.failure_count}</TableCell>
                        <TableCell>
                          ₹{Number(e.amount_stuck).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {e.most_recent_failure
                            ? new Date(e.most_recent_failure).toLocaleString(
                                "en-IN"
                              )
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">
                        Total
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(errors, "failure_count")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(errors, "amount_stuck"))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= GEOGRAPHY ================= */}
          <TabsContent value="geography">
            <div className="flex justify-end mb-3">
              <DownloadButton rows={geography} filename="gift360-geography.csv" />
            </div>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Top Cities by Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={geography.slice(0, 12)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="city"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_revenue" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Unique Customers</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {geography.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell>{g.city}</TableCell>
                        <TableCell>{g.state}</TableCell>
                        <TableCell>{g.unique_customers}</TableCell>
                        <TableCell>{g.total_orders}</TableCell>
                        <TableCell>
                          ₹{Number(g.total_revenue).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-medium">
                        Total ({geography.length} locations)
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(geography, "unique_customers")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(geography, "total_orders")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(geography, "total_revenue"))}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
            <p className="text-xs text-[#6B7280] mt-2">
              City/state comes from the checkout address entered at payment
              time — not every order has one on file, those show as
              "Unknown".
            </p>
          </TabsContent>

          {/* ================= ABANDONED CARTS ================= */}
          <TabsContent value="abandoned">
            <div className="flex justify-end mb-3">
              <DownloadButton
                rows={abandonedDetails}
                filename="gift360-abandoned-carts.csv"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {abandonedSummary.map((s, i) => (
                <StatCard
                  key={i}
                  label={`${s.status} orders`}
                  value={s.order_count}
                />
              ))}
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abandonedDetails.map((a, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {a.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{a.client_name}</div>
                          <div className="text-xs text-[#6B7280]">
                            {a.client_email}
                          </div>
                        </TableCell>
                        <TableCell>{a.brand_name ?? "—"}</TableCell>
                        <TableCell>
                          ₹{Number(a.total_amount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-amber-600 font-medium">
                          {a.order_status}
                        </TableCell>
                        <TableCell className="text-xs">
                          {a.created_at
                            ? new Date(a.created_at).toLocaleString("en-IN")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-medium">
                        Total ({abandonedDetails.length} orders)
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(abandonedDetails, "total_amount"))}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= CURRENT CARTS ================= */}
          <TabsContent value="currentcarts">
            {cartsSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard
                  label="Customers with items in cart"
                  value={cartsSummary.customers_with_items_in_cart}
                />
                <StatCard
                  label="Total cart value"
                  value={Number(cartsSummary.total_cart_value).toLocaleString("en-IN")}
                  prefix="₹"
                />
                <StatCard label="Total line items" value={cartsSummary.total_line_items} />
                <StatCard label="Total units" value={cartsSummary.total_units} />
                <StatCard
                  label="Stale 1hr+ (nudge-ready)"
                  value={cartsSummary.stale_1h_plus}
                />
                <StatCard
                  label="Stale 24hr+ (priority nudge)"
                  value={cartsSummary.stale_24h_plus}
                />
                <StatCard
                  label="Stale 72hr+ (likely lost)"
                  value={cartsSummary.stale_72h_plus}
                />
              </div>
            )}

            <p className="text-xs text-[#6B7280] mb-4 max-w-2xl">
              "Current Carts" is live cart contents (giftcard_cart_items) —
              added the moment someone taps Add to Cart, independent of
              whether they ever start checkout. This is earlier in the funnel
              than "Abandoned Carts" (which requires checkout to have been
              initiated). Staleness buckets are a starting point for
              deciding who's ready for a nudge: too soon after adding and a
              push feels intrusive; the 24hr+ group is generally the
              highest-value target for "you left something" campaigns.
            </p>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">
                  Demand by Brand — What's Sitting in Carts Right Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={cartsByBrand.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="brand_name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-30}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="potential_value" fill="#F59E0B" name="Potential value (₹)" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-[#6B7280] mt-2">
                  High interest but not converting is a signal — a brand
                  showing up here heavily but not in the Brand-wise tab's top
                  revenue list may be a good candidate for a targeted
                  discount push.
                </p>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#6B7280]">Show carts stale:</span>
                <select
                  className="border rounded-md px-3 py-1.5 text-sm"
                  value={cartStaleFilter}
                  onChange={(e) => setCartStaleFilter(Number(e.target.value))}
                >
                  <option value={0}>Any age</option>
                  <option value={1}>1hr+</option>
                  <option value={24}>24hr+ (nudge-ready)</option>
                  <option value={72}>72hr+ (likely lost)</option>
                </select>
                <Button size="sm" onClick={loadAll}>Apply</Button>
              </div>
              <DownloadButton
                rows={cartsByCustomer}
                filename="gift360-current-carts-by-customer.csv"
              />
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Units</TableHead>
                      <TableHead>Cart Value</TableHead>
                      <TableHead>Brands</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Hours Since Update</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cartsByCustomer.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="text-sm">{c.client_name}</div>
                          <div className="text-xs text-[#6B7280]">
                            {c.client_email}
                          </div>
                        </TableCell>
                        <TableCell>{c.client_mobile}</TableCell>
                        <TableCell>{c.item_count}</TableCell>
                        <TableCell>{c.total_units}</TableCell>
                        <TableCell>
                          ₹{Number(c.cart_value).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">
                          {c.brands_in_cart}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.last_updated_at
                            ? new Date(c.last_updated_at).toLocaleString("en-IN")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              Number(c.hours_since_update) >= 72
                                ? "text-red-600 font-medium"
                                : Number(c.hours_since_update) >= 24
                                ? "text-amber-600 font-medium"
                                : "text-[#6B7280]"
                            }
                          >
                            {c.hours_since_update}h
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total ({cartsByCustomer.length} customers)
                      </TableCell>
                      <TableCell />
                      <TableCell className="font-medium">
                        {sumField(cartsByCustomer, "item_count")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sumField(cartsByCustomer, "total_units")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {fmtINR(sumField(cartsByCustomer, "cart_value"))}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= MIS ================= */}
          <TabsContent value="mis">
            {!misMaster ? (
              <div className="text-sm text-[#6B7280]">Loading MIS data…</div>
            ) : (
              <>
                {/* ---- GMV: YTD / MTD / FTD, per the literal template shape ---- */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">GMV</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead></TableHead>
                          <TableHead className="text-right">YTD</TableHead>
                          <TableHead className="text-right">MTD</TableHead>
                          <TableHead className="text-right">FTD</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-[#6B7280]">Count</TableCell>
                          <TableCell className="text-right">{Number(misMaster.gmv?.ytd?.count || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{Number(misMaster.gmv?.mtd?.count || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell className="text-right">{Number(misMaster.gmv?.ftd?.count || 0).toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-[#6B7280]">Value</TableCell>
                          <TableCell className="text-right">{fmtINR(Number(misMaster.gmv?.ytd?.value || 0))}</TableCell>
                          <TableCell className="text-right">{fmtINR(Number(misMaster.gmv?.mtd?.value || 0))}</TableCell>
                          <TableCell className="text-right">{fmtINR(Number(misMaster.gmv?.ftd?.value || 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <StatCard label="Platform Fee" value={fmtINR(Number(misMaster.platformFee || 0))} />
                  <StatCard label="Abuse Users" value={Number(misMaster.abuseUserCount || 0)} />
                </div>

                {/* ---- Profit (formula unconfirmed -- flagged visibly, not hidden) ---- */}
                <Card className="mb-4 border-amber-300">
                  <CardHeader>
                    <CardTitle className="text-sm">Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-[#6B7280] mb-1">Value</div>
                        <div className="text-xl font-bold text-[#111827]">
                          {fmtINR(Number(misMaster.profit?.value || 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#6B7280] mb-1">% of GMV (MTD)</div>
                        <div className="text-xl font-bold text-[#111827]">
                          {Number(misMaster.profit?.percentOfGmv || 0).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-200 rounded p-2">
                      ⚠ {misMaster.profit?.formulaNote}
                    </div>
                  </CardContent>
                </Card>

                {/* ---- SuperCoin Economics ---- */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm">SuperCoin Economics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                      <StatCard label="Coins Earned" value={Number(misMaster.customerEarn?.coinsEarned || 0)} />
                      <StatCard label="Coins Burnt" value={Number(misMaster.customerEarn?.coinsBurnt || 0)} />
                      <StatCard label="VD (voucher margin)" value={fmtINR(Number(misMaster.sabbpeEarning?.vd || 0))} />
                      <StatCard label="SabbPe Earning (FK SC)" value={fmtINR(Number(misMaster.sabbpeEarning?.fkSc || 0))} />
                      <StatCard label="FK Rewards" value={fmtINR(Number(misMaster.sabbpeEarning?.fkRewards || 0))} />
                      <StatCard label="SabbPe Burn" value={`${fmtINR(Number(misMaster.sabbpeBurn?.fkBurnValue || 0))} · 25%`} />
                      <StatCard label="SabbPe Earn FK (leakage)" value={`${fmtINR(Number(misMaster.sabbpeEarnFk?.fkEarnValue || 0))} · 80%`} />
                    </div>
                  </CardContent>
                </Card>

                {/* ---- Transaction Count & Users ---- */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                  <StatCard label="Txn Count (period)" value={Number(misMaster.transactionCount?.mtd_count || 0)} />
                  <StatCard label="Approved" value={Number(misMaster.transactionCount?.approved || 0)} />
                  <StatCard label="Declined" value={Number(misMaster.transactionCount?.declined || 0)} />
                  <StatCard label="Pending" value={Number(misMaster.transactionCount?.pending || 0)} />
                  <StatCard label="Unique Users" value={Number(misMaster.users?.unique_users || 0)} />
                  <StatCard label="Repeat Users" value={Number(misMaster.users?.repeat_users || 0)} />
                </div>

                {/* ---- MDR ---- */}
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">MDR (auto-derived volume, admin-set rates)</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setMdrFormOpen((o) => !o)}>
                      {mdrFormOpen ? "Cancel" : "Update Rates"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {mdrFormOpen && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 p-3 bg-[#F8FAFC] rounded border">
                        {(
                          [
                            ["upiRate", "UPI %"],
                            ["debitRate", "Debit %"],
                            ["creditRate", "Credit %"],
                            ["mobileWalletRate", "Mobile Wallet %"],
                            ["netbankingRate", "Netbanking %"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <Label className="text-xs">{label}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={(mdrForm as any)[key]}
                              onChange={(e) =>
                                setMdrForm((f) => ({ ...f, [key]: e.target.value }))
                              }
                            />
                          </div>
                        ))}
                        <div className="col-span-2 md:col-span-5">
                          <Button size="sm" disabled={mdrFormSaving} onClick={handleMdrSubmit}>
                            {mdrFormSaving ? "Saving…" : "Save Rates"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {mdrRates && (
                      <div className="text-xs text-[#6B7280] mb-3">
                        Current rates (effective {mdrRates.effective_from}): UPI {mdrRates.upi_rate}% ·
                        Debit {mdrRates.debit_rate}% · Credit {mdrRates.credit_rate}% · Mobile Wallet{" "}
                        {mdrRates.mobile_wallet_rate}% · Netbanking {mdrRates.netbanking_rate}%
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mode</TableHead>
                          <TableHead>Txn Count</TableHead>
                          <TableHead>Volume</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>MDR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {misMaster.mdr?.byMode &&
                          Object.entries(misMaster.mdr.byMode).map(([mode, v]: [string, any]) => (
                            <TableRow key={mode}>
                              <TableCell>{mode}</TableCell>
                              <TableCell>{v.txnCount}</TableCell>
                              <TableCell>{fmtINR(Number(v.volume || 0))}</TableCell>
                              <TableCell>{v.rate !== undefined ? `${v.rate}%` : "—"}</TableCell>
                              <TableCell>
                                {v.mdr === "N/A" ? "N/A" : fmtINR(Number(v.mdr || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-medium">Total</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell />
                          <TableCell className="font-medium">
                            {fmtINR(Number(misMaster.mdr?.total || 0))}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                    {Number(misMaster.mdr?.uncategorizedVolume || 0) > 0 && (
                      <div className="text-xs text-amber-700 mt-2">
                        ⚠ {fmtINR(Number(misMaster.mdr.uncategorizedVolume))} in transaction volume has an
                        unrecognized payment mode and is excluded from the MDR total above.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ---- VD Wallet ---- */}
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">ValueDesign Wallet</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setTopupFormOpen((o) => !o)}>
                      {topupFormOpen ? "Cancel" : "Log Top-up"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <div className="text-xs text-[#6B7280] mb-1">Current Balance</div>
                      <div className="text-xl font-bold text-[#111827]">
                        {vdWallet?.currentBalance != null
                          ? fmtINR(Number(vdWallet.currentBalance))
                          : "—"}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">YTD</TableHead>
                          <TableHead className="text-right">MTD</TableHead>
                          <TableHead className="text-right">FTD</TableHead>
                          <TableHead className="text-right">Run Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-right">{fmtINR(Number(vdWallet?.ytd || 0))}</TableCell>
                          <TableCell className="text-right">{fmtINR(Number(vdWallet?.mtd || 0))}</TableCell>
                          <TableCell className="text-right">{fmtINR(Number(vdWallet?.ftd || 0))}</TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const ri = vdWallet?.runRateInputs;
                              if (!ri?.opening_balance || !ri?.closing_balance || !ri?.day_count) return "—";
                              const rate = (Number(ri.opening_balance) - Number(ri.closing_balance)) / Number(ri.day_count);
                              return `${fmtINR(rate)}/day`;
                            })()}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    {topupFormOpen && (
                      <div className="flex flex-wrap items-end gap-2 mb-4 p-3 bg-[#F8FAFC] rounded border mt-4">
                        <div>
                          <Label className="text-xs">Top-up Date</Label>
                          <Input
                            type="date"
                            value={topupForm.topupDate}
                            onChange={(e) =>
                              setTopupForm((f) => ({ ...f, topupDate: e.target.value }))
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Amount (₹)</Label>
                          <Input
                            type="number"
                            value={topupForm.amount}
                            onChange={(e) =>
                              setTopupForm((f) => ({ ...f, amount: e.target.value }))
                            }
                          />
                        </div>
                        <Button size="sm" disabled={topupFormSaving} onClick={handleTopupSubmit}>
                          {topupFormSaving ? "Saving…" : "Save Top-up"}
                        </Button>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Entered By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(vdWallet?.topups || []).map((t: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell>{t.topup_date}</TableCell>
                            <TableCell>{fmtINR(Number(t.amount))}</TableCell>
                            <TableCell>{t.entered_by}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* ---- Voucher Categorization (issued vouchers only) ---- */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Voucher Categorization</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => setThresholdFormOpen((o) => !o)}>
                      {thresholdFormOpen ? "Cancel" : "Set Thresholds"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {thresholdFormOpen && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-3 bg-[#F8FAFC] rounded border">
                        <div>
                          <Label className="text-xs">High Margin threshold</Label>
                          <Select
                            value={thresholdForm.highMarginPct}
                            onValueChange={(v) => setThresholdForm((f) => ({ ...f, highMarginPct: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["3", "5", "7", "10", "15"].map((v) => (
                                <SelectItem key={v} value={v}>{`> ${v}%`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Low Margin threshold</Label>
                          <Select
                            value={thresholdForm.lowMarginPct}
                            onValueChange={(v) => setThresholdForm((f) => ({ ...f, lowMarginPct: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["1", "2", "3", "5"].map((v) => (
                                <SelectItem key={v} value={v}>{`< ${v}%`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">High Volume threshold</Label>
                          <Select
                            value={thresholdForm.highVolumeCount}
                            onValueChange={(v) => setThresholdForm((f) => ({ ...f, highVolumeCount: v }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["10", "25", "50", "100", "200"].map((v) => (
                                <SelectItem key={v} value={v}>{`> ${v} issued`}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3">
                          <Button size="sm" disabled={thresholdFormSaving} onClick={handleThresholdSubmit}>
                            {thresholdFormSaving ? "Saving…" : "Save Thresholds"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {misThresholds && (
                      <div className="text-xs text-[#6B7280] mb-4">
                        Current: High Margin &gt;{misThresholds.high_margin_pct}% · Low Margin &lt;
                        {misThresholds.low_margin_pct}% · High Volume &gt;{misThresholds.high_volume_count} issued
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-medium text-[#111827] mb-2">High Margin</div>
                        <div className="text-sm text-[#6B7280]">
                          {(misMaster.voucherCategorization?.highMargin || []).join(", ") || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#111827] mb-2">Low Margin</div>
                        <div className="text-sm text-[#6B7280]">
                          {(misMaster.voucherCategorization?.lowMargin || []).join(", ") || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#111827] mb-2">High Volume</div>
                        <div className="text-sm text-[#6B7280]">
                          {(misMaster.voucherCategorization?.highVolume || []).join(", ") || "—"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-[#111827] mb-2">Zero Volume</div>
                        <div className="text-sm text-[#6B7280]">
                          {(misMaster.voucherCategorization?.zeroVolume || []).join(", ") || "—"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ==================== SHEET 2: Customer Saving View ==================== */}
                <h3 className="text-lg font-bold text-[#111827] mt-8 mb-4 pt-6 border-t">
                  Gift 360 Customer Saving View
                </h3>

                {!misCustomerSaving ? (
                  <div className="text-sm text-[#6B7280]">Loading…</div>
                ) : (
                  <>
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-sm">Purchases</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-right">YTD</TableHead>
                              <TableHead className="text-right">MTD</TableHead>
                              <TableHead className="text-right">FTD</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-right">{Number(misCustomerSaving.purchases?.ytd || 0).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{Number(misCustomerSaving.purchases?.mtd || 0).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{Number(misCustomerSaving.purchases?.ftd || 0).toLocaleString("en-IN")}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-sm">Customer Earning</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead></TableHead>
                              <TableHead className="text-right">Value</TableHead>
                              <TableHead className="text-right">%</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow>
                              <TableCell className="text-[#6B7280]">SabbPe Cashback</TableCell>
                              <TableCell className="text-right">{fmtINR(Number(misCustomerSaving.customerEarning?.sabbpeCashback?.value || 0))}</TableCell>
                              <TableCell className="text-right">{Number(misCustomerSaving.customerEarning?.sabbpeCashback?.percentOfGmv || 0).toFixed(2)}%</TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell className="text-[#6B7280]">FK SuperCoins</TableCell>
                              <TableCell className="text-right">{Number(misCustomerSaving.customerEarning?.fkSc?.value || 0).toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{Number(misCustomerSaving.customerEarning?.fkSc?.percentOfGmv || 0).toFixed(2)}%</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>

                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-sm">Saving thru Gift360</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-xs text-[#6B7280] mb-1">Value (cashback + SuperCoins earned)</div>
                            <div className="text-xl font-bold text-[#111827]">
                              {fmtINR(Number(misCustomerSaving.savingThruGift360?.value || 0))}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-[#6B7280] mb-1">% of actual cash paid</div>
                            <div className="text-xl font-bold text-[#111827]">
                              {Number(misCustomerSaving.savingThruGift360?.percent || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-[#6B7280] mt-3">
                          Actual cash paid (from payment gateway): {fmtINR(Number(misCustomerSaving.savingThruGift360?.actualPaid || 0))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {loading && (
          <div className="fixed bottom-4 right-4 bg-white shadow-md rounded-md px-4 py-2 text-sm text-[#6B7280]">
            Loading…
          </div>
        )}

        <Dialog open={journeyOpen} onOpenChange={setJourneyOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {journeyData?.profile?.client_name ?? "Customer Journey"}
              </DialogTitle>
            </DialogHeader>
            {journeyLoading && (
              <div className="text-sm text-[#6B7280]">Loading journey…</div>
            )}
            {!journeyLoading && journeyData && (
              <div>
                <div className="text-sm text-[#6B7280] mb-4">
                  {journeyData.profile?.client_email} · {journeyData.profile?.client_mobile}
                </div>
                {journeyData.timeline.length === 0 && (
                  <div className="text-sm text-[#6B7280]">No activity found.</div>
                )}
                <div className="space-y-3">
                  {journeyData.timeline.map((event: any, idx: number) => (
                    <div
                      key={idx}
                      className="border-l-2 border-[#7C3AED] pl-3 py-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#7C3AED]">
                          {event.event_type}
                        </span>
                        <span className="text-xs text-[#6B7280]">
                          {event.event_at
                            ? new Date(event.event_at).toLocaleString("en-IN")
                            : ""}
                        </span>
                      </div>
                      <div className="text-sm">
                        {event.ref}
                        {event.amount != null && ` — ₹${event.amount}`}
                      </div>
                      {event.detail && (
                        <div className="text-xs text-[#6B7280]">{event.detail}</div>
                      )}
                      <div className="text-xs text-[#6B7280]">
                        {event.status_detail}
                        {event.voucher_outcome && ` · ${event.voucher_outcome}`}
                        {event.coins_involved > 0 && ` · ${event.coins_involved} coins`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
