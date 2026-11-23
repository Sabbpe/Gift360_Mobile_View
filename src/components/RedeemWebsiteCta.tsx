import { ExternalLink } from "lucide-react";

type RedeemWebsiteCtaProps = {
  /** Brand's own redemption site (catalog `redemption_website`, V69). */
  url?: string | null;
  brandName?: string | null;
  /** Overrides the default "Redeem on <brand> website" label. */
  label?: string;
  className?: string;
};

/**
 * CTA shown at the end of every "How to Use"/"How to Redeem" surface.
 * Opens the brand's own redemption page in a new tab so the customer can
 * enter the voucher code straight away. Renders nothing when the catalog
 * row has no link, so the UI stays unchanged for brands without one.
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

  const text =
    label || (brandName ? `Redeem on ${brandName} website` : "Go to redemption website");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-2xl min-h-[48px] px-4 py-3 text-center text-sm font-bold leading-snug text-white ${className}`}
      style={{ background: "linear-gradient(90deg, #7b5cff, #5a4bff)" }}
    >
      <ExternalLink size={16} className="shrink-0" aria-hidden="true" />
      <span className="break-words">{text}</span>
    </a>
  );
}
