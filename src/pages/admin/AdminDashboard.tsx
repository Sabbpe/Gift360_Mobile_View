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
  fetchSuperCoinTrend,
  fetchErrorBreakdown,
  fetchGeography,
  fetchAbandonedCarts,
  fetchCartsSummary,
  fetchCartsByCustomer,
  fetchCartsByBrand,
  downloadCsv,
  ADMIN_KEY_STORAGE,
} from "@/api/adminApi";
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
  const [errors, setErrors] = useState<any[]>([]);
  const [geography, setGeography] = useState<any[]>([]);
  const [abandonedSummary, setAbandonedSummary] = useState<any[]>([]);
  const [abandonedDetails, setAbandonedDetails] = useState<any[]>([]);
  const [cartsSummary, setCartsSummary] = useState<any>(null);
  const [cartsByCustomer, setCartsByCustomer] = useState<any[]>([]);
  const [cartsByBrand, setCartsByBrand] = useState<any[]>([]);
  const [cartStaleFilter, setCartStaleFilter] = useState(0);

  const [orderPage, setOrderPage] = useState(0);
  const [voucherStatusFilter, setVoucherStatusFilter] = useState<
    "" | "generated" | "failed"
  >("");
  const [brandFilter, setBrandFilter] = useState("");

  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o, b, c, sc] = await Promise.all([
        fetchSummary({ from, to }),
        fetchOrders({
          from,
          to,
          page: orderPage,
          size: 50,
          voucherStatus: voucherStatusFilter || undefined,
          brandCode: brandFilter || undefined,
        }),
        fetchBrandStats({ from, to }),
        fetchCustomerStats({ from, to, page: 0, size: 50 }),
        fetchSuperCoinTrend({ from, to }),
      ]);
      setSummary(s);
      setOrders(o.data ?? []);
      setBrands(b.data ?? []);
      setCustomers(c.data ?? []);
      setSuperCoins(sc.data ?? []);

      const errData = await fetchErrorBreakdown({ from, to });
      setErrors(errData.data ?? []);

      const geoData = await fetchGeography({ from, to });
      setGeography(geoData.data ?? []);

      const abandonedData = await fetchAbandonedCarts({ from, to, page: 0, size: 100 });
      setAbandonedSummary(abandonedData.summary ?? []);
      setAbandonedDetails(abandonedData.data ?? []);

      const cSummary = await fetchCartsSummary();
      setCartsSummary(cSummary);

      const cByCustomer = await fetchCartsByCustomer({
        minStaleHours: cartStaleFilter,
        page: 0,
        size: 100,
      });
      setCartsByCustomer(cByCustomer.data ?? []);

      const cByBrand = await fetchCartsByBrand();
      setCartsByBrand(cByBrand.data ?? []);
    } catch (err) {
      console.error("Admin dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [from, to, orderPage, voucherStatusFilter, brandFilter, cartStaleFilter]);

  useEffect(() => {
    if (authed) loadAll();
  }, [authed, loadAll]);

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
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="geography">Geography</TabsTrigger>
            <TabsTrigger value="abandoned">Abandoned Carts</TabsTrigger>
            <TabsTrigger value="currentcarts">Current Carts</TabsTrigger>
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
                    label="SuperCoins Redeemed"
                    value={summary.supercoins_redeemed}
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
                                : "text-red-600 font-medium"
                            }
                          >
                            {o.voucher_status}
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
              <DownloadButton rows={customers} filename="gift360-customers.csv" />
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
                      <TableHead>SC Redeemed</TableHead>
                      <TableHead>Last Order</TableHead>
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
                        <TableCell>{c.supercoins_redeemed}</TableCell>
                        <TableCell className="text-xs">
                          {c.last_order_at
                            ? new Date(c.last_order_at).toLocaleDateString("en-IN")
                            : "—"}
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
                        {sumField(customers, "supercoins_redeemed")}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
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
                      dataKey="redeemed"
                      stroke="#3B82F6"
                      name="Redeemed"
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
                      <TableHead>Redeemed</TableHead>
                      <TableHead>Refunded</TableHead>
                      <TableHead>Orders Using SuperCoins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {superCoins.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.day}</TableCell>
                        <TableCell>{Number(s.earned)}</TableCell>
                        <TableCell>{s.redeemed}</TableCell>
                        <TableCell>{s.refunded}</TableCell>
                        <TableCell>{s.orders_using_supercoins}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
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
        </Tabs>

        {loading && (
          <div className="fixed bottom-4 right-4 bg-white shadow-md rounded-md px-4 py-2 text-sm text-[#6B7280]">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
