import { useAuthContext } from "@/contexts/AuthContext";
import { useFetchWallet } from "@/hooks/useFetchWallet";
import { useSuperCoinAccount } from "@/hooks/useSuperCoin";
import { extractSuperCoinBalance } from "@/api/supercoinApi";
import { ArrowLeft, LogOut } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import superCoinIcon from "@/assets/SuperCOin-removebg-preview.png";
import { useEffect } from "react";

function Avatar({ username }: { username: string }) {
  const initial = username.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-[#df9ca9] text-[34px] font-bold leading-none text-white">
      {initial}
    </div>
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

function LogoutButton({
  isLoading,
  onLogout,
}: {
  isLoading: boolean;
  onLogout: () => void;
}) {
  return (
    <button
      onClick={onLogout}
      disabled={isLoading}
      className="mx-auto mt-[30px] flex h-[44px] w-[174px] items-center justify-center gap-[5px] rounded-[9px] bg-[linear-gradient(90deg,#f06da6_0%,#755ff0_100%)] text-[14px] font-semibold text-white active:scale-95 disabled:opacity-70"
    >
      <LogOut className="h-[15px] w-[15px]" strokeWidth={2.2} />
      {isLoading ? "Logging out..." : "Log Out"}
    </button>
  );
}

function ProfileForm({
  profile,
  isLoggingOut,
  onLogout,
}: {
  profile: { username: string; email: string; phone: string; balance: number; superCoinBalance: number; isSuperCoinUser: boolean };
  isLoggingOut: boolean;
  onLogout: () => void;
}) {
  const fields = [
    { label: "Username", value: profile.username },
    { label: "Email", value: profile.email },
    { label: "Phone Number", value: profile.phone },
    {
      label: "Balance",
      value: profile.balance.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
  ];

  return (
    <section className="-mt-[1px] min-h-[calc(100vh-238px)] rounded-t-[34px] bg-[linear-gradient(180deg,#7357f1_0%,#5040a0_72%,#3b327d_100%)] px-[20px] pb-[18px] pt-[32px] shadow-[0_-10px_24px_rgba(69,55,154,0.16)]">
      <div className="space-y-[20px]">
        {fields.map((field) => (
          <InputField key={field.label} label={field.label} value={field.value} />
        ))}

        {/* SuperCoin Balance */}
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

      <LogoutButton isLoading={isLoggingOut} onLogout={onLogout} />
    </section>
  );
}

export default function ProfilePage() {
  const { user, logout: contextLogout, isAuthenticated } = useAuthContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: walletData } = useFetchWallet(user?.clientId);
  const { identity, searchUserMutation, balanceMutation } = useSuperCoinAccount(user?.mobile);

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

  // Auto-fetch SuperCoin balance
  const superCoinBalance = extractSuperCoinBalance(balanceMutation.data);
  const isSuperCoinUser = searchUserMutation.data?.userExists === true ||
    String(searchUserMutation.data?.state || "").toUpperCase() === "ACTIVATED";

  const profile = {
    username: user?.name || "User",
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
        isLoggingOut={false}
        onLogout={handleLogout}
      />
    </main>
  );
}
