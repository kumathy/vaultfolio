import { ExternalLink } from "@/components/external-link";

export const SNAPTRADE_SITE_URL = "https://snaptrade.com";
export const SNAPTRADE_DASHBOARD_URL = "https://dashboard.snaptrade.com";

// SnapTrade's logo, colours and styling are SnapTrade Marks, which its
// Developer Terms of Use reserve. SnapTrade is identified by name only.
export function SnapTradeLink({
  children = "SnapTrade Dashboard",
}: {
  children?: React.ReactNode;
}) {
  return <ExternalLink href={SNAPTRADE_DASHBOARD_URL}>{children}</ExternalLink>;
}

export function SnapTradeName() {
  return (
    <span className="font-medium whitespace-nowrap text-foreground">
      SnapTrade
    </span>
  );
}

const statuses = {
  connected: { dot: "bg-foreground", text: "text-muted" },
  attention: { dot: "bg-attention", text: "text-attention" },
  unknown: { dot: "bg-muted", text: "text-muted" },
} as const;

export function SnapTradeBadge({
  status,
  label,
}: {
  status: keyof typeof statuses;
  label: string;
}) {
  const { dot, text } = statuses[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
      <SnapTradeName />
      <span aria-hidden className="text-border">
        |
      </span>
      <span className={`inline-flex items-center gap-1.5 ${text}`}>
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </span>
    </span>
  );
}
