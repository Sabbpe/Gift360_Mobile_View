// pages/ResellerCart.tsx
// Reseller cart + checkout. Lines come from localStorage; Place Order calls
// POST /v1/reseller/orders (wallet debited server-side, credentials returned
// when fulfillment completes synchronously).
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import {
  getResellerSession,
  getResellerCart,
  saveResellerCart,
  clearResellerCart,
  getResellerBuyer,
  MAX_QTY_PER_SKU,
  saveResellerBuyer,
  fetchResellerWallet,
  createResellerOrder,
  getOrderIdempotencyKey,
  clearOrderIdempotencyKey,
  type ResellerCartItem,
  type ResellerBuyer,
  type ResellerOrderResult,
} from "@/api/resellerApi";
import { useToast } from "@/hooks/use-toast";

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fallbackImg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%23F3E8FF'/><text x='60' y='46' font-size='14' text-anchor='middle' fill='%239747FF' font-family='sans-serif'>Gift</text></svg>";

export default function ResellerCart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const session = getResellerSession();

  const [items, setItems] = useState<ResellerCartItem[]>(() => getResellerCart());
  const [wallet, setWallet] = useState<number | null>(null);
  const [buyer, setBuyer] = useState<ResellerBuyer>(
    () => getResellerBuyer() ?? { fullName: "", email: "", mobile: "" }
  );
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<ResellerOrderResult | null>(null);

  const refreshWallet = useCallback(async () => {
    try {
      const w = await fetchResellerWallet();
      setWallet(w.walletBalance);
    } catch {
      setWallet(null);
    }
  }, []);

  useEffect(() => {
    if (!session?.token) {
      setLocation("/reseller");
      return;
    }
    void refreshWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next: ResellerCartItem[]) => {
    setItems(next);
    saveResellerCart(next);
  };

  const setQty = (sku: string, qty: number) => {
    if (qty > MAX_QTY_PER_SKU) {
      toast({
        title: `Maximum ${MAX_QTY_PER_SKU} per voucher`,
        description: `You can buy at most ${MAX_QTY_PER_SKU} of the same voucher in one order. Place another order for more.`,
        variant: "destructive",
        duration: 3000,
      });
    }
    persist(
      items.map((i) =>
        i.brandSku === sku
          ? { ...i, quantity: Math.max(1, Math.min(MAX_QTY_PER_SKU, qty)) }
          : i
      )
    );
  };

  const remove = (sku: string) => {
    persist(items.filter((i) => i.brandSku !== sku));
  };

  const subtotal = items.reduce(
    (s, i) => s + i.unitPrice * i.quantity,
    0
  );
  const total = items.reduce(
    (s, i) => s + i.unitPrice * i.quantity * (1 - (i.discount || 0) / 100),
    0
  );
  const discount = subtotal - total;
  const insufficient = wallet != null && total > wallet;

  const buyerValid =
    buyer.fullName.trim().split(/\s+/).filter(Boolean).length >= 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyer.email.trim()) &&
    /^[0-9]{10}$/.test(buyer.mobile.trim());

  const placeOrder = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setOrderError(null);
    if (!items.length) return;
    if (!buyerValid) {
      setOrderError(
        "Enter buyer details: full name, valid email and 10-digit mobile."
      );
      return;
    }
    const nameParts = buyer.fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || nameParts[0];
    setPlacing(true);
    try {
      // Same cart + buyer => same key on retry (server replays, no double
      // debit); any change to the checkout makes it a fresh order/key.
      const signature = JSON.stringify({ items, buyer });
      const result = await createResellerOrder(
        {
          order: {
            clientOrderRef: `FE-${Date.now().toString(36).toUpperCase()}`,
            currency: "INR",
            customer: {
              firstName,
              lastName,
              email: buyer.email.trim(),
              mobile: buyer.mobile.trim(),
            },
          },
          items: items.map((i) => ({
            brandSku: i.brandSku,
            brandName: i.brandName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
        getOrderIdempotencyKey(signature)
      );
      saveResellerBuyer(buyer);
      clearResellerCart();
      clearOrderIdempotencyKey();
      setItems([]);
      setPlaced(result);
      void refreshWallet();
      toast({
        title: "Order placed",
        description: `${result.orderNumber} · ${result.status}`,
        duration: 4000,
      });
    } catch (err) {
      const status = (err as any)?.response?.status;
      const d = (err as any)?.response?.data;
      if (!status) {
        setOrderError(
          "Couldn't reach the payment service. Check your connection and try again."
        );
      } else if (status === 402) {
        setOrderError(
          `Insufficient wallet balance for this order. Available: ${
            d?.availableBalance ?? d?.available ?? wallet ?? "—"
          }`
        );
      } else if (status === 401) {
        setOrderError("Session expired. Please login again.");
      } else {
        setOrderError(
          (typeof d === "string" ? d : d?.message) ||
            "Couldn't place the order. Please try again."
        );
      }
    } finally {
      setPlacing(false);
    }
  };

  /* ------------------------------------------------ order success screen */
  if (placed) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{ fontFamily: "Poppins, sans-serif" }}
      >
        <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-lg items-center gap-2">
            <button
              onClick={() => setLocation("/reseller/dashboard")}
              className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-bold text-gray-900">Order placed</h1>
          </div>
        </nav>
        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-base font-bold text-gray-900">
              {placed.orderNumber}
            </p>
            <span className="mt-1 inline-block rounded-full bg-purple-50 px-3 py-1 text-[11px] font-bold text-purple-700">
              {placed.status}
            </span>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <span className="text-gray-500">Amount charged</span>
              <span className="font-bold text-gray-900 tabular-nums">
                {money(Number(placed.totalAmount))}
              </span>
            </div>
          </div>

          {/* Credentials */}
          {placed.items?.some((i) => i.credentials?.length) && (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-gray-900">
                Your vouchers
              </p>
              <div className="space-y-3">
                {placed.items.flatMap((item) =>
                  (item.credentials ?? []).map((cred, ci) => (
                    <div
                      key={`${item.itemId}-${ci}`}
                      className="rounded-xl border border-purple-100 bg-purple-50/50 p-3"
                    >
                      <p className="text-xs font-bold text-purple-800">
                        {item.brandName}
                      </p>
                      <dl className="mt-1.5 space-y-1 text-[11px] text-gray-700">
                        {cred.cardNumber && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Card no.</dt>
                            <dd className="font-mono font-semibold">
                              {cred.cardNumber}
                            </dd>
                          </div>
                        )}
                        {cred.cardPin && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">PIN</dt>
                            <dd className="font-mono font-semibold">
                              {cred.cardPin}
                            </dd>
                          </div>
                        )}
                        {cred.activationCode && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Code</dt>
                            <dd className="font-mono font-semibold">
                              {cred.activationCode}
                            </dd>
                          </div>
                        )}
                        {cred.expiry && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-gray-500">Expiry</dt>
                            <dd className="font-semibold">{cred.expiry}</dd>
                          </div>
                        )}
                      </dl>
                      {cred.activationUrl && (
                        <a
                          href={cred.activationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-[11px] font-semibold text-purple-700 underline"
                        >
                          Open activation link
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
              {placed.items.some(
                (i) => i.fulfillmentStatus === "PROCESSING"
              ) && (
                <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-[11px] text-amber-700">
                  Some items are still processing — pull to refresh orders, or
                  check Recent orders on the dashboard shortly.
                </p>
              )}
            </div>
          )}

          <button
            onClick={() => setLocation("/reseller/dashboard")}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-bold text-white shadow-lg active:scale-95"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  /* ---------------------------------------------------------- cart view */
  return (
    <div
      className="min-h-screen bg-gray-50 pb-40"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            onClick={() => setLocation("/reseller/catalog")}
            className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-sm font-bold text-gray-900">
            Your Cart
            {items.length > 0 && (
              <span className="ml-1.5 text-[11px] font-medium text-gray-400">
                {items.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            )}
          </h1>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-4">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm font-semibold text-gray-900">
              Your cart is empty
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Browse brands and add vouchers to get started.
            </p>
            <button
              onClick={() => setLocation("/reseller/catalog")}
              className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-6 py-2.5 text-xs font-semibold text-white shadow active:scale-95"
            >
              Browse Brands
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.brandSku}
                  className="flex gap-3 rounded-xl bg-white p-3 shadow-[0px_4px_12px_rgba(0,0,0,0.06)]"
                >
                  <img
                    src={item.image || fallbackImg}
                    alt={item.brandName}
                    className="h-14 w-20 shrink-0 rounded-lg object-contain bg-gray-50"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-bold text-gray-900">
                        {item.brandName}
                      </p>
                      <button
                        onClick={() => remove(item.brandSku)}
                        className="shrink-0 rounded-full p-1 text-gray-400 hover:text-red-500"
                        aria-label={`Remove ${item.brandName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      {money(item.unitPrice)} each
                      {item.discount > 0 && (
                        <span className="ml-1 font-semibold text-emerald-600">
                          · {item.discount}% off
                        </span>
                      )}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQty(item.brandSku, item.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-gray-200 text-gray-600 active:scale-90"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => setQty(item.brandSku, item.quantity + 1)}
                          disabled={item.quantity >= MAX_QTY_PER_SKU}
                          className="grid h-7 w-7 place-items-center rounded-full border border-gray-200 text-gray-600 active:scale-90 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-extrabold text-purple-700 tabular-nums">
                        {money(
                          item.unitPrice *
                            item.quantity *
                            (1 - (item.discount || 0) / 100)
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{money(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Reseller discount</span>
                    <span className="tabular-nums">−{money(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Wallet balance</span>
                  <span className="tabular-nums font-semibold text-gray-800">
                    {wallet == null ? "—" : money(wallet)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <span className="text-sm font-bold text-gray-900">
                  Total payable
                </span>
                <span className="text-xl font-extrabold text-purple-700 tabular-nums">
                  {money(total)}
                </span>
              </div>
              {insufficient && (
                <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-[11px] font-medium text-red-600">
                  Wallet balance is lower than this order. Ask your admin to
                  top up, or remove items.
                </p>
              )}
            </div>

            {/* Buyer details */}
            <form onSubmit={placeOrder} className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-gray-900">
                Buyer details
              </p>
              <div className="space-y-2.5">
                <input
                  value={buyer.fullName}
                  onChange={(e) =>
                    setBuyer({ ...buyer, fullName: e.target.value })
                  }
                  placeholder="Full name"
                  className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <input
                  type="email"
                  value={buyer.email}
                  onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                  placeholder="Email"
                  className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={buyer.mobile}
                  onChange={(e) => {
                    if (!/^[0-9]*$/.test(e.target.value)) return;
                    setBuyer({ ...buyer, mobile: e.target.value });
                  }}
                  placeholder="10-digit mobile"
                  className="h-10 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                />
              </div>

              {orderError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}
            </form>
          </>
        )}
      </main>

      {/* Sticky place-order bar */}
      {items.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                Total payable
              </p>
              <p className="text-lg font-extrabold leading-tight text-purple-700 tabular-nums">
                {money(total)}
              </p>
            </div>
            <button
              onClick={(e) => void placeOrder(e)}
              disabled={placing || insufficient || !buyerValid}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {placing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing order...
                </>
              ) : (
                "Place Order"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
