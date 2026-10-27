import Link from "next/link";
import { Suspense } from "react";
import { TbArrowRight } from "react-icons/tb";
import { Logo } from "@/components/logo";
import {
  buttonOutline,
  buttonPrimary,
  buttonProvider,
  compact,
  container,
  large,
} from "@/components/ui";
import { currentUserId } from "@/lib/auth/session";

const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#reports", label: "Reports" },
  { href: "/#security", label: "Security" },
];

// Neutral rather than accent: the accent marks Vaultfolio's own actions, and
// this one hands off to SnapTrade. A plain anchor, because next/link would
// prefetch /login and start OAuth attempts.
export function SignInLink({ size = "large" }: { size?: "large" | "compact" }) {
  if (size === "compact") {
    return (
      <a
        href="/login"
        aria-label="Sign in with SnapTrade"
        className={compact(buttonOutline)}
      >
        Sign in
      </a>
    );
  }
  return (
    <a href="/login" className={`group ${large(buttonProvider)}`}>
      Sign in with SnapTrade
      <TbArrowRight
        aria-hidden
        className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
      />
    </a>
  );
}

async function NavAction() {
  const signedIn = (await currentUserId()) !== null;
  return signedIn ? (
    <Link href="/accounts" className={compact(buttonPrimary)}>
      Open accounts
    </Link>
  ) : (
    <SignInLink size="compact" />
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
          <Suspense fallback={<SignInLink size="compact" />}>
            <NavAction />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
