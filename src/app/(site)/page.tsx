import Link from "next/link";
import { Suspense } from "react";
import type { IconType } from "react-icons";
import {
  TbArrowRight,
  TbBuildingBank,
  TbCalendarCheck,
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
import { Notice, type NoticeTone } from "@/components/notice";
import { ObsidianWindow } from "@/components/site/obsidian-window";
import { SignInLink } from "@/components/site/site-nav";
import {
  buttonPrimary,
  buttonSecondary,
  card,
  chip,
  container,
  SNAPTRADE_DASHBOARD_URL,
  textLink,
} from "@/components/ui";
import { currentUserId } from "@/lib/auth/session";

const messages: Record<string, { tone: NoticeTone; text: string }> = {
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
  signed_out: { tone: "success", text: "Signed out." },
  disconnected: {
    tone: "success",
    text: "SnapTrade access revoked. Stored tokens were deleted.",
  },
  disconnected_unconfirmed: {
    tone: "warning",
    text: "Stored tokens were deleted, but SnapTrade did not confirm the revocation. Access can also be removed in the SnapTrade Dashboard.",
  },
};

const steps: {
  label: string;
  title: string;
  text: string;
  Icon: IconType;
  obsidian?: boolean;
}[] = [
  {
    label: "Step 1",
    title: "SnapTrade",
    text: "Brokerage connections stay in SnapTrade Personal. Vaultfolio receives read-only access through OAuth, and brokerage credentials never reach it.",
    Icon: TbBuildingBank,
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
    obsidian: true,
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

function SectionHeading({
  title,
  text,
  aside,
}: {
  title: string;
  text: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 text-muted">{text}</p>
      </div>
      {aside}
    </div>
  );
}

function IconBadge({
  Icon,
  obsidian = false,
}: {
  Icon: IconType;
  obsidian?: boolean;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl ${
        obsidian ? "bg-violet-soft text-violet" : "bg-accent-soft text-accent"
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
      {message && (
        <div className="mt-8 max-w-xl">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        {signedIn ? (
          <Link href="/accounts" className={buttonPrimary}>
            Open accounts
            <TbArrowRight aria-hidden />
          </Link>
        ) : (
          <SignInLink />
        )}
        <a href="#how-it-works" className={buttonSecondary}>
          How it works
        </a>
      </div>
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <section
        className={`${container} grid items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:py-24`}
      >
        <div>
          <p className={chip}>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            SnapTrade OAuth app
            <span className="text-border">/</span>
            <span className="h-1.5 w-1.5 rounded-full bg-violet" />
            Obsidian plugin
          </p>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
            Brokerage accounts, written into an{" "}
            <span className="text-violet">Obsidian vault</span>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Vaultfolio connects to brokerage accounts through SnapTrade and
            produces monthly Markdown reports on plan execution, contributions,
            registered-account room and distributions. Reports read in the
            browser and sync into Obsidian.
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
            managed in the{" "}
            <a
              href={SNAPTRADE_DASHBOARD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={textLink}
            >
              SnapTrade Dashboard
            </a>
            .
          </p>
        </div>

        <ObsidianWindow />
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-16 border-y border-border bg-surface"
      >
        <div className={`${container} py-20`}>
          <SectionHeading
            title="How it works"
            text="Three systems, each with one job. Brokerage access stays with SnapTrade, report logic lives in Vaultfolio, and notes live in the vault."
          />
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className={`${card} relative p-6`}>
                <IconBadge Icon={step.Icon} obsidian={step.obsidian} />
                <p className="mt-5 text-sm text-muted">{step.label}</p>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                {index < steps.length - 1 && (
                  <TbArrowRight
                    aria-hidden
                    className="absolute top-1/2 -right-[1.1rem] z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full border border-border bg-card p-1 text-muted md:block"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="reports" className={`${container} scroll-mt-16 py-20`}>
        <SectionHeading
          title="What each report contains"
          text="Reports state facts and never recommend a trade. Every setting is optional: missing configuration is noted in the report rather than blocking it."
          aside={<span className={chip}>In development</span>}
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
          className={`${container} grid gap-12 py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]`}
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

      <section className={`${container} py-20`}>
        <div
          className={`${card} flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between lg:p-10`}
        >
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight">Status</h2>
            <p className="mt-2 leading-relaxed text-muted">
              Available: SnapTrade sign-in and account overview. In development:
              monthly reports, settings, Markdown download and the Obsidian
              plugin.
            </p>
          </div>
          <a href="#how-it-works" className={buttonSecondary}>
            How it works
          </a>
        </div>
      </section>
    </main>
  );
}
