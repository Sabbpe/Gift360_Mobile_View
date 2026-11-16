// pages/ResellerCatalog.tsx
// Reseller storefront: brands from GET /v1/reseller/products, each voucher
// with an denomination picker + Add to Cart (cart persisted in localStorage;
// checkout happens on /reseller/cart via POST /v1/reseller/orders).
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Home,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  getResellerSession,
  fetchResellerProducts,
  getResellerCart,
  saveResellerCart,
  MAX_QTY_PER_SKU,
  type ResellerProduct,
  type ResellerCartItem,
} from "@/api/resellerApi";
import { useToast } from "@/hooks/use-toast";

const fallbackImg =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80'><rect width='120' height='80' fill='%23F3E8FF'/><text x='60' y='46' font-size='14' text-anchor='middle' fill='%239747FF' font-family='sans-serif'>Gift</text></svg>";

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Price line for a product: fixed denominations or variable range. */
const priceLabel = (p: ResellerProduct): string => {
  if (p.denominations?.length) {
    const shown = p.denominations.slice(0, 3).map((d) => `₹${d}`);
    const more = p.denominations.length > 3 ? ` +${p.denominations.length - 3}` : "";
    return shown.join(" · ") + more;
  }
  if (p.minPrice != null && p.maxPrice != null) {
    return `${money(p.minPrice)} – ${money(p.maxPrice)}`;
  }
  return "Price unavailable";
};

const isPricable = (p: ResellerProduct): boolean =>
  !!(p.denominations?.length || (p.minPrice != null && p.maxPrice != null));

export default function ResellerCatalog() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const session = getResellerSession();

  const [products, setProducts] = useState<ResellerProduct[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [cart, setCart] = useState<ResellerCartItem[]>(() => getResellerCart());

  // Add-to-cart sheet state
  const [picked, setPicked] = useState<ResellerProduct | null>(null);
  const [pickedDenom, setPickedDenom] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [qty, setQty] = useState(1);

  const load = useCallback(
    async (pageToLoad: number, query: string) => {
      if (pageToLoad === 0) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchResellerProducts({
          search: query || undefined,
          page: pageToLoad,
          size: 20,
        });
        setProducts((prev) =>
          pageToLoad === 0 ? res.products : [...prev, ...res.products]
        );
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      } catch (err) {
        const d = (err as any)?.response?.data;
        setError(
          (typeof d === "string" ? d : d?.message) ||
            "Couldn't load the catalog. Please retry."
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Session guard + first page.
  useEffect(() => {
    if (!session?.token) {
      setLocation("/reseller");
      return;
    }
    void load(0, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    void load(0, searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    if (search) void load(0, "");
    setSearch("");
  };

  const openAdd = (product: ResellerProduct) => {
    setPicked(product);
    setQty(1);
    setCustomAmount("");
    setPickedDenom(
      product.denominations?.length ? product.denominations[0] : null
    );
  };

  const stockQty = () => {
    const s = parseInt(picked?.stockAvailable ?? "10", 10);
    return Math.min(MAX_QTY_PER_SKU, Number.isFinite(s) && s > 0 ? s : MAX_QTY_PER_SKU);
  };

  const unitPrice = (): number | null => {
    if (!picked) return null;
    if (picked.denominations?.length) return pickedDenom;
    const v = Number(customAmount);
    if (
      !Number.isFinite(v) ||
      v <= 0 ||
      (picked.minPrice != null && v < picked.minPrice) ||
      (picked.maxPrice != null && v > picked.maxPrice)
    ) {
      return null;
    }
    return v;
  };

  const addToCart = () => {
    if (!picked) return;
    const unit = unitPrice();
    if (unit == null) {
      toast({
        title: "Choose a valid amount",
        description:
          picked.minPrice != null && picked.maxPrice != null
            ? `Enter an amount between ${money(picked.minPrice)} and ${money(picked.maxPrice)}`
            : "Pick a denomination",
        variant: "destructive",
      });
      return;
    }
    const next = [...getResellerCart()];
    const existing = next.find((i) => i.brandSku === picked.brandSku);
    if (existing) {
      if (existing.quantity + qty > MAX_QTY_PER_SKU) {
        toast({
          title: `Maximum ${MAX_QTY_PER_SKU} per voucher`,
          description: `Your cart already has ${existing.quantity} of this voucher. Only ${MAX_QTY_PER_SKU} are allowed per order.`,
          variant: "destructive",
        });
      }
      existing.quantity = Math.min(existing.quantity + qty, stockQty());
      existing.unitPrice = unit;
    } else {
      next.push({
        brandSku: picked.brandSku,
        brandName: picked.brandName,
        image: picked.images?.[0],
        unitPrice: unit,
        quantity: qty,
        discount: Number(picked.discount) || 0,
      });
    }
    saveResellerCart(next);
    setCart(next);
    toast({
      title: "Added to cart",
      description: `${picked.brandName} · ${money(unit)} × ${qty}`,
      duration: 2500,
    });
    setPicked(null);
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce(
    (s, i) => s + i.unitPrice * i.quantity * (1 - (i.discount || 0) / 100),
    0
  );

  return (
    <div
      className="min-h-screen bg-gray-50 pb-24"
      style={{ fontFamily: "Poppins, sans-serif" }}
    >
      {/* Top bar */}
      <nav className="sticky top-0 z-20 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <button
            onClick={() => setLocation("/reseller/dashboard")}
            className="-ml-1 p-1 text-gray-700 hover:text-gray-900"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-sm font-bold text-gray-900">
            Browse Brands
          </h1>
          <button
            onClick={() => setLocation("/reseller/dashboard")}
            className="rounded-full bg-purple-50 p-2 text-purple-700"
            aria-label="Home"
          >
            <Home className="h-5 w-5" />
          </button>
          <button
            onClick={() => setLocation("/reseller/cart")}
            className="relative rounded-full bg-purple-50 p-2 text-purple-700"
            aria-label="Cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-purple-600 px-1 text-[9px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-lg px-4 py-4">
        {/* Search */}
        <form onSubmit={runSearch} className="mb-4 flex gap-2">
          <div className="flex h-10 flex-1 items-center rounded-xl border border-gray-300 bg-white px-3 focus-within:ring-2 focus-within:ring-purple-500">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search brands (e.g. Bata)"
              className="h-full w-full bg-transparent px-2 text-sm outline-none placeholder:text-gray-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 px-4 text-xs font-semibold text-white shadow transition-all active:scale-95"
          >
            Search
          </button>
        </form>

        {/* States */}
        {error ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-900">
              Catalog unavailable
            </p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
            <button
              onClick={() => void load(0, search)}
              className="mt-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2 text-xs font-semibold text-white shadow active:scale-95"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl bg-white shadow-sm"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-gray-900">
              No brands found
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {search ? `Nothing matches "${search}"` : "Catalog is empty."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-gray-500">
              {products.length} of {totalElements} brands · reseller pricing
              applied at checkout
            </p>
            <div className="grid grid-cols-2 gap-3">
              {products.map((p) => (
                <div
                  key={p.brandSku}
                  className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.06)]"
                >
                  <div className="relative h-20 bg-gray-50">
                    <img
                      src={p.images?.[0] || fallbackImg}
                      alt={p.brandName}
                      loading="lazy"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = fallbackImg;
                      }}
                    />
                    {Number(p.discount) > 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {Number(p.discount)}% off
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="truncate text-xs font-bold text-gray-900">
                      {p.brandName}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {p.category}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-purple-700">
                      {priceLabel(p)}
                    </p>
                    <button
                      onClick={() => openAdd(p)}
                      disabled={!isPricable(p)}
                      className="mt-2 flex h-8 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-[11px] font-semibold text-white shadow transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isPricable(p) ? "Add to Cart" : "Unavailable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {page + 1 < totalPages && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => void load(page + 1, search)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-semibold text-purple-700 shadow ring-1 ring-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load more brands"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                {cartCount} item{cartCount > 1 ? "s" : ""} · est. total
              </p>
              <p className="text-lg font-extrabold leading-tight text-purple-700 tabular-nums">
                {money(cartTotal)}
              </p>
            </div>
            <button
              onClick={() => setLocation("/reseller/cart")}
              className="flex h-10 items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 px-6 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
            >
              <ShoppingCart className="h-4 w-4" />
              View Cart
            </button>
          </div>
        </div>
      )}

      {/* Add-to-cart sheet */}
      {picked && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => setPicked(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200" />
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {picked.brandName}
                </h2>
                <p className="text-xs text-gray-500">{picked.category}</p>
              </div>
              <button
                onClick={() => setPicked(null)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {Number(picked.discount) > 0 && (
              <p className="mt-2 inline-block rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                {Number(picked.discount)}% reseller discount applied at
                checkout
              </p>
            )}

            {/* Denomination */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-gray-700">
                Denomination
              </p>
              {picked.denominations?.length ? (
                <div className="flex flex-wrap gap-2">
                  {picked.denominations.map((d) => (
                    <button
                      key={d}
                      onClick={() => setPickedDenom(d)}
                      className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                        pickedDenom === d
                          ? "border-purple-600 bg-purple-50 text-purple-700"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      ₹{d}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">₹</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={
                      picked.minPrice != null && picked.maxPrice != null
                        ? `${picked.minPrice} – ${picked.maxPrice}`
                        : "Amount"
                    }
                    className="h-11 w-full rounded-xl border border-gray-300 px-3 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700">
                  Quantity
                </p>
                <p className="text-[10px] text-gray-500">
                  In stock: {picked.stockAvailable || "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-gray-600 active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-bold tabular-nums">
                  {qty}
                </span>
                <button
                  onClick={() => setQty((q) => Math.min(stockQty(), q + 1))}
                  className="grid h-9 w-9 place-items-center rounded-full border border-gray-200 text-gray-600 active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Line total + add */}
            <div className="mt-5 rounded-2xl bg-gray-50 p-3">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {unitPrice() != null
                    ? `${money(unitPrice()!)} × ${qty}`
                    : "Select an amount"}
                </span>
                <span>
                  {Number(picked.discount) > 0 && unitPrice() != null
                    ? `-${Number(picked.discount)}%`
                    : ""}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  You pay
                </span>
                <span className="text-lg font-extrabold text-purple-700 tabular-nums">
                  {unitPrice() != null
                    ? money(
                        unitPrice()! * qty * (1 - (Number(picked.discount) || 0) / 100)
                      )
                    : "—"}
                </span>
              </div>
            </div>

            <button
              onClick={addToCart}
              disabled={unitPrice() == null}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
