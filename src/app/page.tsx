import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/notice";
import { Section } from "@/components/section";
import {
  ExternalLink,
  linkClass,
  SNAPTRADE_DASHBOARD_URL,
} from "@/components/text-link";
import { currentUserId } from "@/lib/auth/session";

const messages: Record<string, { tone: "info" | "warning"; text: string }> = {
  state_mismatch: {
    tone: "warning",
    text: "Sign-in could not be verified: the request expired or did not start in this browser. Signing in again starts a new request.",
  },
  access_denied: {
    tone: "info",
    text: "Access was not granted on SnapTrade. No account data was retrieved.",
  },
  login_failed: {
    tone: "warning",
    text: "Sign-in with SnapTrade did not complete. No account data was retrieved.",
  },
  reauthorize: {
    tone: "warning",
    text: "SnapTrade authorization expired or was revoked. Signing in again restores access.",
  },
  unavailable: {
    tone: "warning",
    text: "SnapTrade sign-in is temporarily unavailable.",
  },
  signed_out: { tone: "info", text: "Signed out." },
  disconnected: {
    tone: "info",
    text: "SnapTrade access revoked. Stored tokens were deleted.",
  },
  disconnected_unconfirmed: {
    tone: "warning",
    text: "Stored tokens were deleted, but SnapTrade did not confirm the revocation. Access can also be removed in the SnapTrade Dashboard.",
  },
};

const buttonClass =
  "inline-block bg-accent px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-85";

function SignInLink() {
  // A plain anchor: next/link would prefetch /login and start OAuth attempts.
  return (
    <a href="/login" className={buttonClass}>
      Sign in with SnapTrade
    </a>
  );
}

async function SessionStatus({
  searchParams,
}: {
  searchParams: PageProps<"/">["searchParams"];
}) {
  const params = await searchParams;
  const key = [params.error, params.notice].find(
    (value): value is string => typeof value === "string" && value in messages,
  );
  const message = key ? messages[key] : null;
  const signedIn = (await currentUserId()) !== null;

  return (
    <>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <div className="mt-8">
        {signedIn ? (
          <Link href="/accounts" className={buttonClass}>
            View accounts
          </Link>
        ) : (
          <SignInLink />
        )}
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Investing reports from brokerage data
      </h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        Vaultfolio reads account data through SnapTrade and produces structured
        Markdown reports: plan execution, contributions and growth,
        registered-account room, and distributions. Reports are viewable in the
        browser and sync into an Obsidian vault.
      </p>

      <Suspense
        fallback={
          <div className="mt-8">
            <SignInLink />
          </div>
        }
      >
        <SessionStatus searchParams={searchParams} />
      </Suspense>

      <p className="mt-4 max-w-xl text-sm text-muted">
        Requires a SnapTrade Personal account with a connected brokerage.
        Connections are managed in the{" "}
        <ExternalLink href={SNAPTRADE_DASHBOARD_URL}>
          SnapTrade Dashboard
        </ExternalLink>
        .
      </p>

      <Section title="Access">
        <ul className="max-w-xl space-y-3 leading-relaxed">
          <li>
            Sign-in happens on SnapTrade. Vaultfolio never receives brokerage
            credentials.
          </li>
          <li>
            Access is read-only. The trading permission is never requested, so
            no order can be placed.
          </li>
          <li>
            Access tokens are encrypted at rest. Brokerage data is fetched on
            demand and not stored.
          </li>
          <li>
            Access can be revoked at any time with Disconnect on the{" "}
            <Link href="/accounts" className={linkClass}>
              accounts page
            </Link>{" "}
            or in the SnapTrade Dashboard.
          </li>
        </ul>
      </Section>

      <Section title="Status">
        <p className="max-w-xl leading-relaxed">
          Available: SnapTrade sign-in and account overview. In development:
          monthly reports, settings, Markdown download, and the Obsidian plugin.
        </p>
      </Section>
    </main>
  );
}
