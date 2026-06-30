import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { FloatingCoins } from "@/components/FloatingCoins";
import MobileBottomNav from "@/components/MobileBottomNav";
import { useNotification } from "@/contexts/NotificationContext";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const { notifications } = useNotification();

  return (
    <div className="notification-page pb-20">
      <FloatingCoins count={6} />

      <div className="absolute inset-0">
        <div
          className="absolute -top-10 -left-10 h-72 w-72 rounded-full blur-3xl anim-aurora"
          style={{
            background:
              "radial-gradient(circle, hsla(280,90%,60%,0.22), transparent 70%)",
          }}
        />
        <div
          className="absolute top-32 -right-16 h-80 w-80 rounded-full blur-3xl anim-aurora"
          style={{
            background:
              "radial-gradient(circle, hsla(220,90%,55%,0.18), transparent 70%)",
            animationDelay: "3s",
          }}
        />
        <div
          className="absolute bottom-20 left-1/4 h-56 w-56 rounded-full blur-3xl anim-aurora"
          style={{
            background:
              "radial-gradient(circle, hsla(48,95%,60%,0.14), transparent 70%)",
            animationDelay: "6s",
          }}
        />
        <div className="absolute inset-0 hero-grain opacity-30 pointer-events-none" />
      </div>

      <div className="relative px-6 pt-12">
        <button
          onClick={() => setLocation("/")}
          className="mb-5 inline-flex items-center gap-2 text-[#3E3E3E] active:scale-95"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>

        <h1 className="text-[24px] font-semibold text-[#3E3E3E]">
          Notification
        </h1>
      </div>

      <div className="relative px-6 pt-8">
        {notifications.length === 0 ? (
          <div className="rounded-[16px] bg-white px-6 py-12 text-center shadow-[0_6px_14px_rgba(0,0,0,0.1)]">
            <Bell className="mx-auto mb-3 h-10 w-10 text-[#67657C]" />
            <h2 className="text-[20px] font-semibold text-[#3E3E3E]">
              No notifications yet
            </h2>
            <p className="mt-2 text-[14px] leading-[18px] text-[#67657C]">
              Voucher updates like add to cart and successful purchases will
              appear here.
            </p>
          </div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className="notification-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-medium text-[#3E3E3E]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-[240px] text-[14px] leading-[18px] text-[#3E3E3E]">
                    {item.message}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] leading-[18px] text-[#67657C]">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
