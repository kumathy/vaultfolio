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
