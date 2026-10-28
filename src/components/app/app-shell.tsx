import {
  TbArrowUpRight,
  TbBuildingBank,
  TbMenu2,
  TbNotebook,
  TbX,
} from "react-icons/tb";
import Link from "next/link";
import { Logo } from "@/components/logo";
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
    <aside
      id={MENU_ID}
      popover="auto"
      aria-label="Menu"
      className="fixed inset-y-0 right-auto left-0 m-0 h-dvh w-72 max-w-[85vw] flex-col border-0 border-r border-border bg-surface p-0 text-foreground backdrop:bg-black/50 [&:popover-open]:flex lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:max-w-none lg:shrink-0"
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
        <SidebarGroup title="SnapTrade">
          <a
            href={SNAPTRADE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            <TbBuildingBank aria-hidden className="text-lg" />
            Manage connections
            <TbArrowUpRight aria-hidden className="ml-auto" />
          </a>
        </SidebarGroup>
      </nav>

      <Link
        href="/settings#obsidian"
        className="m-3 block rounded-xl border border-accent/25 bg-accent-soft p-4 text-sm transition-colors hover:border-accent/50"
      >
        <span className="flex items-center gap-2 font-medium text-accent">
          <TbNotebook aria-hidden className="text-lg" />
          Obsidian
        </span>
        {/* Reserves the two status lines so the card does not resize. */}
        <Suspense fallback={<span className="mt-2 block h-10" aria-hidden />}>
          <ObsidianSidebarStatus />
        </Suspense>
      </Link>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <span className="lg:hidden">
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
        <main className="flex-1 px-6 py-8 animate-page-in motion-reduce:animate-none lg:px-10 lg:py-10">
          {children}
        </main>
        <footer className="border-t border-border px-6 py-5 text-xs text-muted lg:px-10">
          Brokerage data via <SnapTradeName />. For information only. Not
          financial advice.
        </footer>
      </div>
    </div>
  );
}
