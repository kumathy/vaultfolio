import { TbArrowUpRight, TbBuildingBank, TbNotebook } from "react-icons/tb";
import { Logo } from "@/components/logo";
import { SNAPTRADE_DASHBOARD_URL, SnapTradeName } from "@/components/snaptrade";
import { Suspense } from "react";
import {
  Breadcrumb,
  BreadcrumbView,
  MobileLinks,
  MobileLinksView,
  SidebarLinks,
  SidebarLinksView,
} from "./nav";

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

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo href="/accounts" />
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

      <div className="m-3 rounded-xl border border-accent/25 bg-accent-soft p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-accent">
          <TbNotebook aria-hidden className="text-lg" />
          Obsidian plugin
        </p>
        <p className="mt-1.5 leading-relaxed text-muted">
          Monthly reports sync into a vault folder.
        </p>
      </div>
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
      </div>
      <div className="border-t border-border px-4 py-2 lg:hidden">
        <Suspense fallback={<MobileLinksView pathname={null} />}>
          <MobileLinks />
        </Suspense>
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
