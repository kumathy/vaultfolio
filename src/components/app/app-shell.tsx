import { TbArrowUpRight, TbBuildingBank, TbMenu2, TbX } from "react-icons/tb";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { MockDataBar } from "./mock-data-bar";
import { ObsidianSidebarStatus } from "./obsidian-status";
import { SNAPTRADE_DASHBOARD_URL, SnapTradeName } from "@/components/snaptrade";
import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbView,
  CloseMenuOnLinkClick,
  SidebarLinks,
  SidebarLinksView,
} from "./nav";

const MENU_ID = "app-menu";

const connectionRow =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted transition-colors hover:bg-card hover:text-foreground";

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="px-3 pb-2 text-xs font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

// One sidebar for every screen size: a fixed column on desktop, and on narrow
// screens a popover drawer opened from the top bar. The popover API provides
// Escape, outside-tap dismissal and stacking without extra code.
function Sidebar() {
  return (
    <>
      <aside
        id={MENU_ID}
        popover="auto"
        aria-label="Menu"
        className="menu-drawer fixed inset-y-0 right-auto left-0 m-0 h-dvh w-72 max-w-[85vw] flex-col border-0 border-r border-border bg-surface p-0 text-foreground [&:popover-open]:flex lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:max-w-none lg:shrink-0"
      >
        <CloseMenuOnLinkClick menuId={MENU_ID} />
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Logo href="/accounts" />
          <button
            type="button"
            popoverTarget={MENU_ID}
            popoverTargetAction="hide"
            aria-label="Close menu"
            className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-card hover:text-foreground lg:hidden"
          >
            <TbX aria-hidden className="text-lg" />
          </button>
        </div>

        <nav aria-label="App" className="flex-1 space-y-7 px-3 py-6 text-sm">
          <SidebarGroup title="Workspace">
            <Suspense fallback={<SidebarLinksView pathname={null} />}>
              <SidebarLinks />
            </Suspense>
          </SidebarGroup>
          {/* One line per service, like the links above, each ending in a
            trailing indicator: ↗ for SnapTrade, sync status for Obsidian. */}
          <SidebarGroup title="Connections">
            <ul className="space-y-0.5">
              <li>
                <a
                  href={SNAPTRADE_DASHBOARD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={connectionRow}
                >
                  <TbBuildingBank aria-hidden className="shrink-0 text-lg" />
                  SnapTrade
                  <TbArrowUpRight aria-hidden className="ml-auto shrink-0" />
                  <span className="sr-only">
                    (manage brokerages, opens in a new tab)
                  </span>
                </a>
              </li>
              <li>
                <Link href="/settings#obsidian" className={connectionRow}>
                  {/* Obsidian's logomark, unmodified, from obsidian.md/brand. */}
                  <Image
                    src="/brand/obsidian-logo.svg"
                    alt=""
                    width={18}
                    height={18}
                    unoptimized
                    className="shrink-0"
                  />
                  Obsidian
                  <span className="ml-auto text-xs">
                    <Suspense fallback={null}>
                      <ObsidianSidebarStatus />
                    </Suspense>
                  </span>
                </Link>
              </li>
            </ul>
          </SidebarGroup>
        </nav>
      </aside>
      {/* Dims the page behind the open phone menu (globals.css). */}
      <div aria-hidden className="menu-scrim" />
    </>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex lg:hidden">
            <Logo href="/accounts" />
          </span>
          <span className="hidden lg:block">
            <Suspense fallback={<BreadcrumbView pathname={null} />}>
              <Breadcrumb />
            </Suspense>
          </span>
        </div>
        <button
          type="button"
          popoverTarget={MENU_ID}
          aria-label="Open menu"
          className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground lg:hidden"
        >
          <TbMenu2 aria-hidden className="text-xl" />
        </button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <MockDataBar />
        <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
        <footer className="border-t border-border px-6 py-5 text-xs text-muted lg:px-10">
          Brokerage data via <SnapTradeName />. For information only. Not
          financial advice.
        </footer>
      </div>
    </div>
  );
}
