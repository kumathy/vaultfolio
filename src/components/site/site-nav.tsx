import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { buttonPrimary, container } from "@/components/ui";
import { currentUserId } from "@/lib/auth/session";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#reports", label: "Reports" },
  { href: "/#security", label: "Security" },
];

const compactButton = buttonPrimary.replace("px-5 py-2.5", "px-4 py-2");

export function SignInLink({ className = buttonPrimary }) {
  // A plain anchor: next/link would prefetch /login and start OAuth attempts.
  return (
    <a href="/login" className={className}>
      Sign in with SnapTrade
    </a>
  );
}

async function NavAction() {
  const signedIn = (await currentUserId()) !== null;
  return signedIn ? (
    <Link href="/accounts" className={compactButton}>
      Open accounts
    </Link>
  ) : (
    <SignInLink className={compactButton} />
  );
}

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div
        className={`${container} flex h-16 items-center justify-between gap-4`}
      >
        <Logo />
        <nav
          aria-label="Main"
          className="hidden items-center gap-1 text-sm md:flex"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Suspense fallback={<SignInLink className={compactButton} />}>
            <NavAction />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
