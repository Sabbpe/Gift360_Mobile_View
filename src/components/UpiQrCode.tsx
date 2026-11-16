// components/UpiQrCode.tsx
// QR fallback for the UPI-intent payment: scan from ANY phone/UPI app when the
// deeplink cannot be launched directly (e.g. iOS has no UPI chooser, or the
// app is not installed). The QR encodes the backend-provided deeplink verbatim
// - the client never constructs upi:// itself.
// Pure addition; nothing else depends on this component.
import { QRCodeSVG } from "qrcode.react";

interface UpiQrCodeProps {
  value: string;
  size?: number;
}

export default function UpiQrCode({ value, size = 176 }: UpiQrCodeProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#E2D9FF]">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#3B1E78"
      />
      <p className="text-[10px] font-semibold text-[#5B2B99]">
        Scan with any UPI app
      </p>
    </div>
  );
}
