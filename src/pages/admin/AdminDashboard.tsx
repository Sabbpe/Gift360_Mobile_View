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
  ADMIN_KEY_STORAGE,
} from "@/api/adminApi";

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
    } catch (err) {
      console.error("Admin dashboard load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [from, to, orderPage, voucherStatusFilter, brandFilter]);

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
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= CUSTOMERS ================= */}
          <TabsContent value="customers">
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