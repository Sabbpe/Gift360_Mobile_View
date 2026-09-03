import { useAuthContext } from "@/contexts/AuthContext";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { ArrowLeft, LogOut, Check, Pencil, Mail, X } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { useEffect, useState } from "react";
import RewardsTab from "@/components/RewardsTab";

const DISPLAY_NAME_KEY = "displayName";

function Avatar({ username }: { username: string }) {
  const initial = username.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-[#df9ca9] text-[34px] font-bold leading-none text-white">
      {initial}
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
      <span className="block text-[14px] font-normal leading-none text-white">{label}</span>
      <input
        readOnly
        value={value}
        className="mt-[8px] h-[44px] w-full rounded-[7px] border-0 bg-white px-[13px] text-[14px] font-medium text-[#333333] outline-none"
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
}: {
  profile: { username: string; email: string; phone: string; balance: number; superCoinBalance: number; isSuperCoinUser: boolean };
  clientId: string | undefined;
  initialTab: "profile" | "rewards";
  isLoggingOut: boolean;
  onLogout: () => void;
  onUsernameSave: (name: string) => void;
  onContactUs: () => void;
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
              <img src={superCoinIcon} alt="" className="h-[18px] w-[18px]" />
              <span className="text-[14px] font-semibold text-[#7C3AED]">
                {profile.superCoinBalance.toLocaleString("en-IN")} coins
              </span>
            </div>
          </label>
        )}
      </div>
      )}

      {/* Support Section */}
      <div className="mt-[28px] rounded-[12px] border border-white/25 bg-white/12 px-[16px] py-[14px]">
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
      <main className="flex min-h-screen w-full items-center justify-center bg-white px-6 font-body">
        <button
          onClick={() => setLocation("/login")}
          className="h-12 rounded-[10px] bg-[#6b55ee] px-8 text-[15px] font-semibold text-white active:scale-95"
        >
          Login / Register
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-hidden bg-white font-body text-[#3f3f3f]">
      <section className="relative h-[238px] bg-white px-[20px] pt-[22px]">
        <button
          onClick={() => window.history.back()}
          className="grid h-[26px] w-[26px] place-items-center text-black active:scale-95"
          aria-label="Go back"
        >
          <ArrowLeft className="h-[20px] w-[20px]" strokeWidth={2.2} />
        </button>

        <div className="mt-[16px] flex flex-col items-center">
          <Avatar username={profile.username} />
          <h1 className="mt-[18px] text-center text-[21px] font-semibold leading-none tracking-[-0.02em] text-[#454545]">
            {profile.username}
          </h1>
        </div>
      </section>

      <ProfileForm
        profile={profile}
        clientId={user?.clientId}
        initialTab={new URLSearchParams(window.location.search).get("tab") === "rewards" ? "rewards" : "profile"}
        isLoggingOut={false}
        onLogout={handleLogout}
        onUsernameSave={handleUsernameSave}
        onContactUs={() => setShowContactModal(true)}
      />

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
