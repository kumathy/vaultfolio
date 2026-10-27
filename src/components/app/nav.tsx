"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { IconType } from "react-icons";
import { TbFileText, TbSettings, TbWallet } from "react-icons/tb";

export const appPages: { href: `/${string}`; label: string; Icon: IconType }[] =
  [
    { href: "/accounts", label: "Accounts", Icon: TbWallet },
    { href: "/reports", label: "Reports", Icon: TbFileText },
    { href: "/settings", label: "Settings", Icon: TbSettings },
  ];

// `null` while the URL is not yet known (the prerendered fallback).
const isActive = (pathname: string | null, href: string) =>
  pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));

export function SidebarLinksView({ pathname }: { pathname: string | null }) {
  return (
    <ul className="space-y-0.5">
      {appPages.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                active
                  ? "bg-card font-medium text-foreground"
                  : "text-muted hover:bg-card hover:text-foreground"
              }`}
            >
              <Icon
                aria-hidden
                className={`text-lg ${active ? "text-accent" : ""}`}
              />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BreadcrumbView({ pathname }: { pathname: string | null }) {
  const page = appPages.find(({ href }) => isActive(pathname, href));
  return (
    <p className="truncate text-sm text-muted">
      Vaultfolio
      {page && (
        <>
          <span className="px-2 text-border">/</span>
          <span className="text-foreground">{page.label}</span>
        </>
      )}
    </p>
  );
}

export function MobileLinksView({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="App" className="flex gap-1 lg:hidden">
      {appPages.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface hover:text-foreground aria-[current=page]:bg-surface aria-[current=page]:text-foreground"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export const SidebarLinks = () => <SidebarLinksView pathname={usePathname()} />;
export const Breadcrumb = () => <BreadcrumbView pathname={usePathname()} />;
export const MobileLinks = () => <MobileLinksView pathname={usePathname()} />;
