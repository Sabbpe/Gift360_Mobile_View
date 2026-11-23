import { ExternalLink } from "lucide-react";

type RedeemWebsiteCtaProps = {
  /** Brand's own redemption site (catalog `redemption_website`, V69). */
  url?: string | null;
  /** Used only for the accessible label/tooltip — the visible text is fixed. */
  brandName?: string | null;
  /** Optional override of the fixed label (kept single-line, truncated). */
  label?: string;
  className?: string;
};

const DEFAULT_LABEL = "Go to Redeem Website";

/**
 * CTA shown at the end of every "How to Use"/"How to Redeem" surface.
 * Opens the brand's own redemption page in a new tab so the customer can
 * enter the voucher code straight away.
 *
 * Fixed height + single-line label keep the button exactly the same size on
 * every brand/screen; the brand name only appears in the tooltip/aria-label.
 * Renders nothing when the catalog row has no link, so the UI stays unchanged
 * for brands without one.
 */
export default function RedeemWebsiteCta({
  url,
  brandName,
  label,
  className = "",
}: RedeemWebsiteCtaProps) {
  const href = (url || "").trim();
  // Only ever emit an absolute http(s) link — never javascript:/data: URLs.
  if (!/^https?:\/\//i.test(href)) return null;

  const text = (label || DEFAULT_LABEL).trim();

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={brandName ? `${text} for ${brandName}` : text}
      title={brandName ? `${brandName} — ${href}` : href}
      className={`flex h-11 w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#DCD3FF] bg-[#EDEAFF] px-3 text-[12px] font-semibold leading-none text-[#7B5CFF] transition-colors hover:bg-[#E4DEFF] active:scale-[0.99] ${className}`}
    >
      <ExternalLink size={14} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{text}</span>
    </a>
  );
}
