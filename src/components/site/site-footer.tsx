import { LogoMark } from "@/components/logo";
import { SnapTradeLink, SnapTradeName } from "@/components/snaptrade";
import { container } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={`${container} flex flex-col gap-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between`}
      >
        <div className="flex items-center gap-3">
          <LogoMark className="h-5 w-5" />
          <p>
            Brokerage data via <SnapTradeName />. For information only. Not
            financial advice.
          </p>
        </div>
        <SnapTradeLink />
      </div>
    </footer>
  );
}
