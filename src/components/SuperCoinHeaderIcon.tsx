import superCoinImg from "@/assets/SuperCOin-removebg-preview.png";

interface SuperCoinHeaderIconProps {
  onClick: () => void;
  frozen?: boolean;
}

/**
 * "Convert coins" shortcut for the Home header: a plain, always-visible pill.
 * (Previously an icon that expanded/collapsed on a timer with a "Try Now" tag
 * and a one-time white tip -- three competing bits of UI in one corner.)
 */
export default function SuperCoinHeaderIcon({ onClick, frozen = false }: SuperCoinHeaderIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Convert SuperCoins to gift voucher"
      className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/30 bg-white/15 pl-1.5 pr-3 text-white transition-transform active:scale-95 ${
        frozen ? "opacity-40 grayscale" : ""
      }`}
    >
      <img src={superCoinImg} alt="" loading="lazy" decoding="async" className="h-6 w-6 object-contain" />
      <span className="whitespace-nowrap text-[12px] font-semibold leading-none">Convert coins</span>
    </button>
  );
}
