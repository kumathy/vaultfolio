import { TbArrowUpRight } from "react-icons/tb";
import { LogoMark } from "@/components/logo";
import { container, SNAPTRADE_DASHBOARD_URL } from "@/components/ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={`${container} flex flex-col gap-4 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between`}
      >
        <div className="flex items-center gap-3">
          <LogoMark className="h-5 w-5" />
          <p>
            Brokerage data via SnapTrade. For information only. Not financial
            advice.
          </p>
        </div>
        <a
          href={SNAPTRADE_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          SnapTrade Dashboard
          <TbArrowUpRight aria-hidden />
        </a>
      </div>
    </footer>
  );
}
