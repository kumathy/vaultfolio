import Link from "next/link";
import { Suspense } from "react";
import type { IconType } from "react-icons";
import {
  TbArrowDown,
  TbArrowRight,
  TbBuildingBank,
  TbCalendarCheck,
  TbCheck,
  TbCoins,
  TbEyeCheck,
  TbFileAnalytics,
  TbLock,
  TbLogin2,
  TbNotebook,
  TbPlugConnectedX,
  TbReceipt2,
  TbWallet,
} from "react-icons/tb";
import { ClearSearchParams } from "@/components/clear-search-params";
import { Notice, type NoticeTone } from "@/components/notice";
import { Toast, type ToastTone } from "@/components/toast";
import { ObsidianWindow } from "@/components/site/obsidian-window";
import { SignInLink } from "@/components/site/site-nav";
import { ExternalLink } from "@/components/external-link";
import { SNAPTRADE_SITE_URL, SnapTradeLink } from "@/components/snaptrade";
import { buttonPrimary, card, chip, container, large } from "@/components/ui";
import { currentUserId } from "@/lib/auth/session";

const OBSIDIAN_SITE_URL = "https://obsidian.md";

// Confirmations appear as a toast; problems that need action stay inline next
// to the sign-in button.
type Message =
  | { display: "toast"; tone: ToastTone; text: string }
  | { display: "inline"; tone: NoticeTone; text: string };

const messages: Record<string, Message> = {
  state_mismatch: {
    display: "inline",
    tone: "warning",
    text: "Sign-in could not be verified: the request expired or did not start in this browser. Signing in again starts a new request.",
  },
  access_denied: {
    display: "toast",
    tone: "info",
    text: "Access was not granted on SnapTrade. No account data was retrieved.",
  },
  login_failed: {
    display: "inline",
    tone: "warning",
    text: "Sign-in with SnapTrade did not complete. No account data was retrieved.",
  },
  reauthorize: {
    display: "inline",
    tone: "warning",
    text: "SnapTrade authorization expired or was revoked. Signing in again restores access.",
  },
  unavailable: {
    display: "inline",
    tone: "warning",
    text: "SnapTrade sign-in is temporarily unavailable.",
  },
  signed_out: { display: "toast", tone: "success", text: "Signed out." },
  disconnected: {
    display: "toast",
    tone: "success",
    text: "SnapTrade access revoked. Stored tokens were deleted.",
  },
  disconnected_unconfirmed: {
    display: "inline",
    tone: "warning",
    text: "Stored tokens were deleted, but SnapTrade did not confirm the revocation. Access can also be removed in the SnapTrade Dashboard.",
  },
};

const steps: {
  label: string;
  title: string;
  text: string;
  Icon: IconType;
  neutral?: boolean;
}[] = [
  {
    label: "Step 1",
    title: "SnapTrade",
    text: "Brokerage connections stay in SnapTrade Personal. Vaultfolio receives read-only access through OAuth, and brokerage credentials never reach it.",
    Icon: TbBuildingBank,
    neutral: true,
  },
  {
    label: "Step 2",
    title: "Vaultfolio",
    text: "Reports are generated on demand from live account data and rendered as Markdown. No brokerage data is stored.",
    Icon: TbFileAnalytics,
  },
  {
    label: "Step 3",
    title: "Obsidian",
    text: "The plugin writes each monthly report into a vault folder, with frontmatter ready for Dataview queries.",
    Icon: TbNotebook,
  },
];

const reportSections: {
  title: string;
  text: string;
  Icon: IconType;
  sample: [string, string];
}[] = [
  {
    title: "Plan check",
    text: "Confirms the monthly deposit arrived and was invested in the plan’s holdings, and flags cash left uninvested.",
    Icon: TbCalendarCheck,
    sample: ["Deposit received", "On track"],
  },
  {
    title: "Contributions and growth",
    text: "Total contributed against current value. Growth is shown in dollars, since recurring deposits make percentage returns misleading.",
    Icon: TbCoins,
    sample: ["Net growth", "+$412.55"],
  },
  {
    title: "Registered-account room",
    text: "TFSA, RRSP and FHSA contributions tracked against starting room, with a projection to December 31.",
    Icon: TbWallet,
    sample: ["TFSA room remaining", "$2,100.00"],
  },
  {
    title: "Distributions",
    text: "History per payment and per symbol, plus a labelled 12-month estimate from trailing distributions.",
    Icon: TbReceipt2,
    sample: ["Next 12 months (Estimate)", "~$46.00"],
  },
];

const safeguards: { title: string; text: string; Icon: IconType }[] = [
  {
    title: "Sign-in on SnapTrade",
    text: "Authorization happens on SnapTrade with PKCE. Brokerage credentials never reach Vaultfolio.",
    Icon: TbLogin2,
  },
  {
    title: "Read-only",
    text: "The trading permission is never requested, so no order can be placed.",
    Icon: TbEyeCheck,
  },
  {
    title: "Encrypted tokens",
    text: "Access tokens are encrypted at rest with AES-256-GCM. Brokerage data is fetched on demand and never stored.",
    Icon: TbLock,
  },
  {
    title: "Revocable",
    text: "Disconnect revokes access at SnapTrade and deletes stored tokens. Access can also be removed in the SnapTrade Dashboard.",
    Icon: TbPlugConnectedX,
  },
];

function SectionHeading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-10 max-w-2xl">
      <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-muted">{text}</p>
    </div>
  );
}

function IconBadge({
  Icon,
  neutral = false,
}: {
  Icon: IconType;
  neutral?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
        neutral
          ? "border border-border bg-surface text-foreground"
          : "bg-accent-soft text-accent"
      }`}
    >
      <Icon aria-hidden />
    </span>
  );
}

async function HeroActions({
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
      {message && <ClearSearchParams keys="error,notice" />}
      {message?.display === "toast" && (
        <Toast tone={message.tone} message={message.text} />
      )}
      {message?.display === "inline" && (
        <div className="mt-8 max-w-xl">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        {signedIn ? (
          <Link href="/accounts" className={large(buttonPrimary)}>
            Open accounts
            <TbArrowRight aria-hidden />
          </Link>
        ) : (
          <SignInLink />
        )}
        <a
          href="#how-it-works"
          className="inline-flex w-full items-center justify-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground sm:w-auto"
        >
          How it works
          <TbArrowDown aria-hidden />
        </a>
      </div>
      {!signedIn && (
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {[
            "Read-only access",
            "Revocable at any time",
            "No brokerage credentials shared",
          ].map((point) => (
            <li key={point} className="inline-flex items-center gap-1.5">
              <TbCheck aria-hidden className="text-foreground" />
              {point}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function ClosingAction() {
  const signedIn = (await currentUserId()) !== null;
  return signedIn ? (
    <Link href="/accounts" className={large(buttonPrimary)}>
      Open accounts
      <TbArrowRight aria-hidden />
    </Link>
  ) : (
    <SignInLink />
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <section
        className={`${container} grid items-center gap-12 pt-10 pb-14 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:py-24`}
      >
        <div>
          <p className={chip}>
            SnapTrade OAuth app
            <span className="text-border">/</span>
            Obsidian plugin
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            Brokerage accounts, written into an{" "}
            <span className="text-accent">Obsidian vault</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Vaultfolio connects to brokerage accounts through{" "}
            <ExternalLink href={SNAPTRADE_SITE_URL}>SnapTrade</ExternalLink> and
            produces monthly Markdown reports on plan execution, contributions,
            registered-account room and distributions. Reports read in the
            browser and sync into{" "}
            <ExternalLink href={OBSIDIAN_SITE_URL}>Obsidian</ExternalLink>.
          </p>

          <Suspense
            fallback={
              <div className="mt-8 flex flex-wrap gap-3">
                <SignInLink />
              </div>
            }
          >
            <HeroActions searchParams={searchParams} />
          </Suspense>

          <p className="mt-6 max-w-xl text-sm text-muted">
            Requires a SnapTrade Personal account with a connected brokerage,
            managed in the <SnapTradeLink />.
          </p>
        </div>

        <ObsidianWindow />
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-16 border-y border-border bg-surface"
      >
        <div className={`${container} py-14 md:py-20`}>
          <SectionHeading
            title="How it works"
            text="Three systems, each with one job. Brokerage access stays with SnapTrade, report logic lives in Vaultfolio, and notes live in the vault."
          />
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className={`${card} relative p-6`}>
                <IconBadge Icon={step.Icon} neutral={step.neutral} />
                <p className="mt-5 text-sm text-muted">{step.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                {index < steps.length - 1 && (
                  <TbArrowRight
                    aria-hidden
                    className="absolute -bottom-[1.1rem] left-1/2 z-10 h-7 w-7 -translate-x-1/2 rotate-90 rounded-full border border-border bg-card p-1 text-muted md:top-1/2 md:-right-[1.1rem] md:bottom-auto md:left-auto md:translate-x-0 md:-translate-y-1/2 md:rotate-0"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="reports"
        className={`${container} scroll-mt-16 py-14 md:py-20`}
      >
        <SectionHeading
          title="What each report contains"
          text="Reports state facts and never recommend a trade. Every setting is optional: missing configuration is noted in the report rather than blocking it."
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {reportSections.map((section) => (
            <article
              key={section.title}
              className={`${card} flex flex-col p-6 transition-colors hover:border-muted`}
            >
              <IconBadge Icon={section.Icon} />
              <h3 className="mt-5 text-lg font-semibold">{section.title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-muted">
                {section.text}
              </p>
              <p className="mt-5 flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-sm tabular-nums">
                <span className="text-muted">{section.sample[0]}</span>
                <span className="font-medium">{section.sample[1]}</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="security"
        className="scroll-mt-16 border-t border-border bg-surface"
      >
        <div
          className={`${container} grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]`}
        >
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              Access and data handling
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Vaultfolio is a SnapTrade OAuth app with read-only scope. The
              client secret and all tokens stay on the server.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {safeguards.map((item) => (
              <li key={item.title} className={`${card} p-6`}>
                <IconBadge Icon={item.Icon} />
                <h3 className="mt-5 font-semibold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${container} py-14 md:py-20`}>
        <div
          className={`${card} flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between lg:p-10`}
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">
              A report for every month, in the vault
            </h2>
            <p className="mt-2 leading-relaxed text-muted">
              Sign in with SnapTrade and the first report is generated from
              current account data. Settings add detail but are never required.
            </p>
          </div>
          <Suspense fallback={<SignInLink />}>
            <ClosingAction />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
