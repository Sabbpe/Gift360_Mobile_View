import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const NOTIFICATIONS_STORAGE_KEY = "g360_notifications";

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  type: "success" | "info";
  createdAt: string;
  eventKey?: string;
};

type NotificationInput = {
  title?: string;
  message: string;
  type?: "success" | "info";
  eventKey?: string;
};

type NotificationContextValue = {
  notifications: AppNotification[];
  addNotification: (notification: NotificationInput) => void;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined
);

function NotificationToast({
  notification,
  visible,
}: {
  notification: AppNotification | null;
  visible: boolean;
}) {
  if (!notification) return null;

  return (
    <div className={`notification-toast ${visible ? "show" : ""}`}>
      <div className="notification-toast__title">{notification.title}</div>
      <p className="notification-toast__message">{notification.message}</p>
    </div>
  );
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  });
  const [toastNotification, setToastNotification] =
    useState<AppNotification | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications)
    );
  }, [notifications]);

  useEffect(() => {
    if (!toastNotification) return;

    setToastVisible(true);
    const hideTimer = window.setTimeout(() => {
      setToastVisible(false);
    }, 3000);
    const clearTimer = window.setTimeout(() => {
      setToastNotification(null);
    }, 3400);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(clearTimer);
    };
  }, [toastNotification]);

  const addNotification = useCallback((notification: NotificationInput) => {
    const nextNotification: AppNotification = {
      id: Date.now(),
      title:
        notification.title ||
        (notification.type === "success" ? "Congratulations!" : "Notification"),
      message: notification.message,
      type: notification.type || "info",
      createdAt: new Date().toISOString(),
      eventKey: notification.eventKey,
    };

    setNotifications((prev) => {
      if (
        nextNotification.eventKey &&
        prev.some((item) => item.eventKey === nextNotification.eventKey)
      ) {
        return prev;
      }

      return [nextNotification, ...prev].slice(0, 50);
    });

    setToastNotification(nextNotification);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      addNotification,
    }),
    [notifications, addNotification]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationToast
        notification={toastNotification}
        visible={toastVisible}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }

  return context;
}
