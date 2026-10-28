import { TbBrandGithub } from "react-icons/tb";
import { ExternalLink } from "@/components/external-link";
import { LogoMark } from "@/components/logo";
import { SnapTradeLink, SnapTradeName } from "@/components/snaptrade";
import { container } from "@/components/ui";

const SOURCE_URL = "https://github.com/kumathy/vaultfolio";

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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="inline-flex items-center gap-1.5">
            <TbBrandGithub aria-hidden className="text-base" />
            <ExternalLink href={SOURCE_URL}>Source code</ExternalLink>
          </span>
          <SnapTradeLink />
        </div>
      </div>
    </footer>
  );
}
