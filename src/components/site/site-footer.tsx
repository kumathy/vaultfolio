import { TbBrandGithub } from "react-icons/tb";
import { ExternalLink } from "@/components/external-link";
import { SnapTradeLink, SnapTradeName } from "@/components/snaptrade";
import { container } from "@/components/ui";

const SOURCE_URL = "https://github.com/kumathy/vaultfolio";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div
        className={`${container} flex flex-col items-center gap-4 py-8 text-center text-sm text-muted lg:flex-row lg:justify-between lg:gap-8 lg:text-left`}
      >
        <p className="lg:whitespace-nowrap">
          Brokerage data via <SnapTradeName />. Open source. For information
          only. Not financial advice.
        </p>
        <div className="order-first flex shrink-0 items-center justify-center gap-6 whitespace-nowrap lg:order-none">
          <span className="inline-flex items-center gap-1.5">
            <TbBrandGithub aria-hidden className="text-base" />
            <ExternalLink href={SOURCE_URL}>GitHub</ExternalLink>
          </span>
          <SnapTradeLink />
        </div>
      </div>
    </footer>
  );
}
