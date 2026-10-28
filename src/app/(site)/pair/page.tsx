import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TbArrowLeft, TbCheck } from "react-icons/tb";
import { LogoMark } from "@/components/logo";
import { SignInLink } from "@/components/site/sign-in-link";
import { card, container } from "@/components/ui";
import { isChallenge } from "@/lib/auth/plugin";
import { currentUserId } from "@/lib/auth/session";
import { PairForm } from "./pair-form";

export const metadata: Metadata = { title: "Connect Obsidian" };

// Signed-in users return to the app, everyone else to the landing page.
function HomeLogo({ href }: { href: "/" | "/accounts" }) {
  return (
    <Link
      href={href}
      aria-label="Vaultfolio home"
      className="mb-6 inline-block rounded-xl"
    >
      <LogoMark className="h-11 w-11" />
    </Link>
  );
}

function BackLink({ href }: { href: "/" | "/settings#obsidian" }) {
  return (
    <Link
      href={href}
      className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
    >
      <TbArrowLeft aria-hidden />
      Back to Vaultfolio
    </Link>
  );
}

const access = [
  "Reads the monthly reports only",
  "Never sees SnapTrade sign-in or brokerage credentials",
  "Revocable at any time in Settings",
];

async function PairContent({
  searchParams,
}: {
  searchParams: PageProps<"/pair">["searchParams"];
}) {
  const { challenge } = await searchParams;
  const signedIn = (await currentUserId()) !== null;
  const logo = <HomeLogo href={signedIn ? "/accounts" : "/"} />;
  const back = <BackLink href={signedIn ? "/settings#obsidian" : "/"} />;

  if (!isChallenge(challenge)) {
    return (
      <>
        {logo}
        <h1 className="text-2xl font-semibold tracking-tight">
          Start from Obsidian
        </h1>
        <p className="mt-2 leading-relaxed text-muted">
          Pairing begins in the Vaultfolio plugin: Settings → Vaultfolio →
          Connect. That opens this page with a one-time link.
        </p>
        {back}
      </>
    );
  }

  return (
    <>
      {logo}
      <h1 className="text-2xl font-semibold tracking-tight">
        Connect an Obsidian vault
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        The Vaultfolio plugin will sync monthly reports into the vault that
        opened this page.
      </p>
      <ul className="mt-5 space-y-2 text-sm">
        {access.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <TbCheck aria-hidden className="text-accent" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {signedIn ? (
          <PairForm challenge={challenge} />
        ) : (
          <SignInLink
            href={`/login?next=${encodeURIComponent(`/pair?challenge=${challenge}`)}`}
          />
        )}
      </div>
      {back}
    </>
  );
}

export default function PairPage({ searchParams }: PageProps<"/pair">) {
  return (
    <main className={`${container} flex justify-center py-16 sm:py-24`}>
      <div className={`${card} w-full max-w-lg p-6 sm:p-8`}>
        <Suspense
          fallback={
            <>
              <HomeLogo href="/" />
              <div className="h-48 animate-pulse rounded bg-surface" />
            </>
          }
        >
          <PairContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
