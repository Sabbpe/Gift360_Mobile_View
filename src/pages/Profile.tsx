import { useAuthContext } from "@/contexts/AuthContext";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { ArrowLeft, LogOut, Check, Pencil, Mail, X, Store, Tag, Zap, Coins, UserRound, ArrowRight, ChevronRight, Package, Gift, HelpCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { useEffect, useState } from "react";
import RewardsTab from "@/components/RewardsTab";
import Header from "@/components/Header";
import { fetchNewOrders } from "@/api/orderApi";
import { getImageUrl as getImageUrlUtil, FALLBACK_IMAGE } from "@/utils/imageUrl";

const DISPLAY_NAME_KEY = "displayName";

function Avatar({ username }: { username: string }) {
  const initial = username.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-[#df9ca9] text-[34px] font-bold leading-none text-white">
      {initial}
    </div>
  );
}

function GuestFeatureRow({
  icon: Icon,
  title,
  color,
}: {
  icon: LucideIcon;
  title: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#F0ECF8] py-4 last:border-b-0">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-full" style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}>
        <Icon className="h-5 w-5" style={{ color }} strokeWidth={2} />
      </div>
      <span className="flex-1 text-[14px] font-semibold text-[#40365B]">{title}</span>
      <ArrowRight className="h-4 w-4 text-[#A59BBE]" />
    </div>
  );
}

function AccountMenuRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[64px] w-full items-center gap-3 border-b border-[#F0ECF8] px-4 py-3 text-left last:border-b-0 active:bg-primary/5">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-5 w-5" strokeWidth={1.9} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#30284A]">{label}</span>
        {description && <span className="mt-0.5 block truncate text-[11px] text-[#81789A]">{description}</span>}
      </span>
      <ChevronRight className="h-4 w-4 flex-none text-[#A59BBE]" />
    </button>
  );
}

function OrderPreviewCard({ order }: { order: any }) {
  const firstItem = order?.items?.[0];
  const meta = firstItem?.meta || {};
  const merchant = meta.brand_name || meta.brandName || firstItem?.brand_name || "Gift voucher";
  const itemCount = (order?.items || []).reduce((total: number, item: any) => total + Number(item?.quantity || 1), 0);
  const dateValue = order?.created_at || order?.createdAt;
  const image = getImageUrlUtil(meta) || FALLBACK_IMAGE;
  return (
    <div className="rounded-2xl border border-[#E8E3F2] bg-white p-3">
      <div className="flex items-center gap-3">
        <img src={image} alt="" className="h-12 w-12 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#30284A]">{merchant}</p>
          <p className="mt-1 text-[11px] text-[#81789A]">
            {itemCount} {itemCount === 1 ? "item" : "items"} · {dateValue ? new Date(dateValue).toLocaleDateString("en-IN") : "Date unavailable"}
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
          {String(order?.status || "PROCESSING")}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#F0ECF8] pt-3 text-[12px]">
        <span className="text-[#81789A]">Total bill</span>
        <span className="font-bold text-[#30284A]">₹{Number(order?.pricing?.final_payable ?? order?.pricing?.subtotal ?? order?.total_amount ?? 0).toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

function EditableField({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
  };

  return (
    <label className="block">
      <span className="block text-[14px] font-normal leading-none text-white">{label}</span>
      <div className="mt-[8px] flex gap-2">
        <input
          readOnly={!editing}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={editing ? handleKeyDown : undefined}
          className={`h-[44px] flex-1 rounded-[7px] border-0 bg-white px-[13px] text-[14px] font-medium text-[#333333] outline-none ${editing ? "ring-2 ring-white/50" : ""}`}
        />
        {editing ? (
          <button
            type="button"
            onClick={handleSave}
            className="h-[44px] w-[44px] rounded-[7px] bg-white flex items-center justify-center active:scale-95"
          >
            <Check className="h-5 w-5 text-[#7C3AED]" strokeWidth={2.5} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="h-[44px] w-[44px] rounded-[7px] bg-white/20 flex items-center justify-center active:scale-95"
          >
            <Pencil className="h-4 w-4 text-white" />
          </button>
        )}
      </div>
    </label>
  );
}

function InputField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium leading-none text-[#81789A]">{label}</span>
      <input
        readOnly
        value={value}
        className="mt-[8px] h-[44px] w-full rounded-[10px] border border-[#E8E3F2] bg-[#F8F7FB] px-[13px] text-[14px] font-medium text-[#333333] outline-none"
      />
    </label>
  );
}

function ProfileForm({
  profile,
  clientId,
  initialTab,
  isLoggingOut,
  onLogout,
  onUsernameSave,
  onContactUs,
  onPartnerUs,
}: {
  profile: { username: string; email: string; phone: string; balance: number; superCoinBalance: number; isSuperCoinUser: boolean };
  clientId: string | undefined;
  initialTab: "profile" | "rewards";
  isLoggingOut: boolean;
  onLogout: () => void;
  onUsernameSave: (name: string) => void;
  onContactUs: () => void;
  onPartnerUs: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"profile" | "rewards">(initialTab);

  return (
    <section className="-mt-[1px] min-h-[calc(100vh-238px)] rounded-t-[34px] bg-[linear-gradient(180deg,#7357f1_0%,#5040a0_72%,#3b327d_100%)] px-[20px] pb-[18px] pt-[32px] shadow-[0_-10px_24px_rgba(69,55,154,0.16)]">
      <div className="flex gap-2 rounded-[10px] bg-white/10 p-[4px]">
        {(["profile", "rewards"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-[7px] py-[8px] text-[13px] font-semibold capitalize transition-colors ${
              activeTab === tab ? "bg-white text-[#7C3AED]" : "text-white/70"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "rewards" ? (
        <div className="mt-[20px]">
          <RewardsTab clientId={clientId} />
        </div>
      ) : (
      <div className="mt-[20px] space-y-[20px]">
        <EditableField label="Username" value={profile.username} onSave={onUsernameSave} />
        <InputField label="Email" value={profile.email} />
        <InputField label="Phone Number" value={profile.phone} />
        <InputField
          label="Balance"
          value={profile.balance.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        />

        {profile.isSuperCoinUser && (
          <label className="block">
            <span className="block text-[14px] font-normal leading-none text-white">SuperCoin Balance</span>
            <div className="mt-[8px] h-[44px] w-full rounded-[7px] border-0 bg-white px-[13px] flex items-center gap-2">
              <img loading="lazy" decoding="async" src={superCoinIcon} alt="" className="h-[18px] w-[18px]" />
              <span className="text-[14px] font-semibold text-[#7C3AED]">
                {profile.superCoinBalance.toLocaleString("en-IN")} coins
              </span>
            </div>
          </label>
        )}
      </div>
      )}

      {/* Partner with us */}
      <div className="mt-[16px] rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[14px]">
        <p className="text-[14px] font-semibold text-white">Partner with us</p>
        <p className="mt-[4px] text-[12px] leading-[1.4] text-white/70">
          Grow as a reseller — sell gift vouchers at your own margins.
        </p>
        <button
          onClick={onPartnerUs}
          className="mt-[12px] flex h-[40px] w-full items-center justify-center gap-[6px] rounded-[9px] bg-white text-[13px] font-semibold text-[#7C3AED] active:scale-95"
        >
          <Store className="h-[14px] w-[14px] text-[#7C3AED]" strokeWidth={2.2} />
          Partner with us
        </button>
      </div>

      {/* Support Section */}
      <div className="mt-[16px] rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[14px]">
        <p className="text-[14px] font-semibold text-white">Need help?</p>
        <p className="mt-[4px] text-[12px] leading-[1.4] text-white/70">
          Having a voucher or payment issue? We're here to help.
        </p>
        <button
          onClick={onContactUs}
          className="mt-[12px] flex h-[40px] w-full items-center justify-center gap-[6px] rounded-[9px] bg-white text-[13px] font-semibold text-[#7C3AED] active:scale-95"
        >
          <Mail className="h-[14px] w-[14px] text-[#7C3AED]" strokeWidth={2.2} />
          Contact Us
        </button>
      </div>

      <button
        onClick={onLogout}
        disabled={isLoggingOut}
        className="mx-auto mt-[20px] flex h-[44px] w-[174px] items-center justify-center gap-[5px] rounded-[9px] bg-[linear-gradient(90deg,#f06da6_0%,#755ff0_100%)] text-[14px] font-semibold text-white active:scale-95 disabled:opacity-70"
      >
        <LogOut className="h-[15px] w-[15px]" strokeWidth={2.2} />
        {isLoggingOut ? "Logging out..." : "Log Out"}
      </button>
    </section>
  );
}

export default function ProfilePage() {
  const { user, logout: contextLogout, isAuthenticated } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: walletData } = useFetchWallet(user?.clientId);
  const { identity, searchUserMutation, balanceMutation } = useSuperCoinAccount(user?.mobile);

  const [displayName, setDisplayName] = useState(() => localStorage.getItem(DISPLAY_NAME_KEY) || user?.name || "User");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showRewards, setShowRewards] = useState(() => new URLSearchParams(window.location.search).get("tab") === "rewards");
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(false);

  // Auto-fetch SuperCoin search + balance
  useEffect(() => {
    if (!identity) return;
    if (!searchUserMutation.data && !searchUserMutation.isPending && !searchUserMutation.isError) {
      searchUserMutation.mutate();
    }
  }, [identity]);

  useEffect(() => {
    if (!identity) return;
    const userExists = searchUserMutation.data?.userExists === true ||
      String(searchUserMutation.data?.state || "").toUpperCase() === "ACTIVATED";
    if (userExists && !balanceMutation.data && !balanceMutation.isPending && !balanceMutation.isError) {
      balanceMutation.mutate();
    }
  }, [identity, searchUserMutation.data]);

  useEffect(() => {
    if (!user?.clientId) return;
    let active = true;
    setOrdersLoading(true);
    setOrdersError(false);
    Promise.all([
      fetchNewOrders(user.clientId, "NORMAL"),
      fetchNewOrders(user.clientId, "SUPERCOIN"),
    ]).then(([normal, superCoin]) => {
      if (!active) return;
      const normalOrders = normal.data?.orders || normal.orders || [];
      const superCoinOrders = superCoin.data?.orders || superCoin.orders || [];
      const orders = [...normalOrders, ...superCoinOrders]
        .sort((a, b) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
        .slice(0, 3);
      setRecentOrders(orders);
    }).catch(() => {
      if (active) setOrdersError(true);
    }).finally(() => {
      if (active) setOrdersLoading(false);
    });
    return () => { active = false; };
  }, [user?.clientId]);

  const superCoinBalance = extractSuperCoinBalance(balanceMutation.data);
  const isSuperCoinUser = searchUserMutation.data?.userExists === true ||
    String(searchUserMutation.data?.state || "").toUpperCase() === "ACTIVATED";

  const handleUsernameSave = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(DISPLAY_NAME_KEY, trimmed);
    setDisplayName(trimmed);
    toast({ title: "Name updated", duration: 2000 });
  };

  const profile = {
    username: displayName,
    email: user?.email || "",
    phone: user?.mobile || "",
    balance: walletData?.totalBalance ?? 0,
    superCoinBalance,
    isSuperCoinUser,
  };

  const handleLogout = () => {
    if (!user?.token) return;

    contextLogout();
    localStorage.removeItem("shopping_cart");
    toast({
      title: "Logged out",
      description: "You have been logged out",
      duration: 3000,
    });
    setLocation("/login");
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen w-full bg-[#F8F7FF] px-5 pb-32 font-body text-[#332A4A] sm:px-8">
        <Header />
        <div className="mx-auto max-w-[560px] pt-7 sm:pt-10">
          <section className="rounded-[24px] border border-[#DCD2FF] bg-[#EDE9FE] px-5 py-5 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/90 shadow-[0_10px_22px_rgba(82,61,169,0.16)]">
              <UserRound className="h-12 w-12 text-primary" strokeWidth={1.7} />
            </div>
            <h1 className="mt-4 text-[22px] font-bold leading-tight text-[#28165F]">Your Account</h1>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[#665A83]">
              Everything you love, all in one place.
            </p>
          </section>

          <section className="mt-[18px] rounded-[22px] border border-[#E7E1F7] bg-white px-[18px] py-2 shadow-[0_8px_18px_rgba(63,26,85,0.06)]">
            <GuestFeatureRow icon={Tag} title="370+ brand vouchers" color="hsl(var(--primary))" />
            <GuestFeatureRow icon={Zap} title="Instant delivery" color="hsl(var(--primary))" />
            <GuestFeatureRow icon={Coins} title="SuperCoins cashback rewards" color="hsl(var(--primary))" />
          </section>

          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="mt-[22px] flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-[16px] font-bold text-primary-foreground shadow-[0_5px_12px_hsl(var(--primary)/0.28)] transition-transform active:scale-[0.98]"
          >
            Sign in / Create account
          </button>
          <p className="mt-3 text-center text-[11px] text-[#81789A]">
            Sign in to unlock your personalised Gift360 experience.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#F8F7FB] pb-24 font-body text-[#30284A]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[#ECE8F4] bg-white px-4">
        <button type="button" onClick={() => window.history.back()} className="grid h-10 w-10 place-items-center" aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[15px] font-bold tracking-wide">MY ACCOUNT</h1>
        <button type="button" onClick={() => setShowContactModal(true)} className="flex h-10 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-primary">
          <HelpCircle className="h-4 w-4" /> Help
        </button>
      </header>

      <div className="mx-auto max-w-[620px] space-y-4 px-4 py-4">
        <section className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
          <div className="flex items-center gap-3">
            <Avatar username={profile.username} />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[18px] font-bold">{profile.username}</h2>
              <p className="mt-1 truncate text-[12px] text-[#81789A]">{profile.email || "Email unavailable"}</p>
              <p className="mt-0.5 text-[12px] text-[#81789A]">{profile.phone || "Phone unavailable"}</p>
            </div>
            <button type="button" onClick={() => handleUsernameSave(window.prompt("Update your name", profile.username) || profile.username)} className="rounded-lg px-2 py-2 text-[11px] font-semibold text-primary">
              Edit
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
            <p className="text-[11px] text-[#81789A]">Balance</p>
            <p className="mt-1 text-[18px] font-bold">₹{profile.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
            <p className="text-[11px] text-[#81789A]">SuperCoins</p>
            <p className="mt-1 text-[18px] font-bold text-primary">{profile.isSuperCoinUser ? profile.superCoinBalance.toLocaleString("en-IN") : "0"}</p>
          </div>
        </section>

        {showRewards ? (
          <section className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">Rewards & SuperCoins</h2>
              <button type="button" onClick={() => setShowRewards(false)} className="text-[12px] font-semibold text-primary">Back</button>
            </div>
            <RewardsTab clientId={user?.clientId} />
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-[#E8E3F2] bg-white">
          <AccountMenuRow icon={UserRound} label="Profile details" description="Name, email and phone number" onClick={() => document.getElementById("profile-details")?.scrollIntoView({ behavior: "smooth" })} />
          <AccountMenuRow icon={Coins} label="Rewards / SuperCoins" description="View your rewards balance" onClick={() => { setShowRewards(true); window.history.replaceState(null, "", "/profile?tab=rewards"); }} />
          <AccountMenuRow icon={Package} label="Past Orders" description="View your recent voucher orders" onClick={() => setLocation("/orders")} />
          <AccountMenuRow icon={Gift} label="My Vouchers" description="Open your purchased and redeemed vouchers" onClick={() => setLocation("/orders?tab=vouchers")} />
          <AccountMenuRow icon={Store} label="Partner with us" description="Sell gift vouchers at your own margins" onClick={() => setLocation("/reseller")} />
          <AccountMenuRow icon={Mail} label="Contact Us" description="Get help with vouchers or payments" onClick={() => setShowContactModal(true)} />
        </section>

        <section id="profile-details" className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
          <h2 className="text-[16px] font-bold">Profile details</h2>
          <div className="mt-3 space-y-3">
            <InputField label="Email" value={profile.email} />
            <InputField label="Phone Number" value={profile.phone} />
          </div>
        </section>

        <section className="rounded-2xl border border-[#E8E3F2] bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold">Past Orders</h2>
            <button type="button" onClick={() => setLocation("/orders")} className="text-[12px] font-semibold text-primary">View all</button>
          </div>
          <div className="mt-3 space-y-3">
            {ordersLoading && [1, 2].map((item) => <div key={item} className="h-[92px] animate-pulse rounded-2xl bg-[#F0ECF8]" />)}
            {!ordersLoading && ordersError && <p className="rounded-xl bg-red-50 p-3 text-[12px] text-red-600">Unable to load orders right now.</p>}
            {!ordersLoading && !ordersError && recentOrders.length === 0 && <p className="rounded-xl bg-[#F8F7FB] p-4 text-center text-[12px] text-[#81789A]">No orders yet.</p>}
            {!ordersLoading && !ordersError && recentOrders.map((order) => <OrderPreviewCard key={order.order_id || order.order_number} order={order} />)}
          </div>
        </section>

        <button type="button" onClick={handleLogout} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-[14px] font-semibold text-red-600 active:bg-red-50">
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </div>

      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-indigo-600">
              <Mail className="h-7 w-7 text-white" />
            </div>

            <h3 className="text-[18px] font-bold text-gray-900">Contact Us</h3>

            <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
              For any queries, reach out to{" "}
              <a href="mailto:gift360@gift360.io" className="font-semibold text-[#7C3AED] underline underline-offset-2">
                gift360@gift360.io
              </a>.
            </p>

            <p className="mt-3 text-[14px] leading-relaxed text-gray-600">
              <span className="font-semibold text-[#7C3AED]">Note:</span> If a transaction was successful but the voucher was not generated, please share the details at{" "}
              <a href="mailto:gift360@gift360.io" className="font-semibold text-[#7C3AED] underline underline-offset-2">
                gift360@gift360.io
              </a>{" "}
              for quick action on the issue.
            </p>

            <button
              onClick={() => setShowContactModal(false)}
              className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-[15px] font-semibold text-white shadow-md active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
