import { Wifi, Signal, BatteryFull } from "lucide-react";

export const StatusBar = ({ dark = false }: { dark?: boolean }) => (
  <div className={`status-bar ${dark ? "text-white" : "text-foreground"}`}>
    <span>9:30</span>
    <div className="flex items-center gap-1.5">
      <Signal className="w-3.5 h-3.5" />
      <Wifi className="w-3.5 h-3.5" />
      <BatteryFull className="w-4 h-4" />
    </div>
  </div>
);
