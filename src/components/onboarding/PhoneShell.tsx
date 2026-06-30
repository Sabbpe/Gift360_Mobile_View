import { ReactNode } from "react";

export const PhoneShell = ({ children }: { children: ReactNode }) => (
  <div className="phone-frame">
    <div className="phone-notch" />
    <div className="phone-screen">{children}</div>
  </div>
);
