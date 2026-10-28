import Image from "next/image";
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
import { LogoMark } from "@/components/logo";
import { PluginDownloadLink } from "@/components/plugin-download";
import { HeroBackdrop } from "@/components/site/hero-backdrop";
import { ObsidianWindow } from "@/components/site/obsidian-window";
import { SignInLink } from "@/components/site/sign-in-link";
import { ExternalLink } from "@/components/external-link";
import { SNAPTRADE_SITE_URL, SnapTradeLink } from "@/components/snaptrade";
import {
  buttonPrimary,
  buttonGlass,
  card,
  container,
  large,
} from "@/components/ui";
import { currentUserId } from "@/lib/auth/session";
import {
  buildExampleReport,
  EXAMPLE_PERIOD,
  EXAMPLE_SETTINGS,
} from "@/lib/reports/example";
import { addMonths } from "@/lib/reports/period";

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
  download?: boolean;
}[] = [
  {
    label: "Step 1",
    title: "SnapTrade",
    text: "Brokerages connect to SnapTrade Personal. Vaultfolio gets read-only access through OAuth.",
    Icon: TbBuildingBank,
  },
  {
    label: "Step 2",
    title: "Vaultfolio",
    text: "Builds each report on demand from live account data, as Markdown.",
    Icon: TbFileAnalytics,
  },
  {
    label: "Step 3",
    title: "Obsidian",
    text: "The plugin syncs reports into a vault folder, with frontmatter for Dataview.",
    Icon: TbNotebook,
    download: true,
  },
];

const reportSections: {
  title: string;
  text: string;
  Icon: IconType;
  sample: [string, string];
}[] = [
  {
    title: "Monthly activity",
    text: "Deposits, purchases and distributions, against an optional monthly target. Idle cash is flagged.",
    Icon: TbCalendarCheck,
    sample: ["Contributions", "On track"],
  },
  {
    title: "Contributions and growth",
    text: "Total contributed against current value, with growth in dollars.",
    Icon: TbCoins,
    sample: ["Net growth", "+$412.55"],
  },
  {
    title: "Registered-account room",
    text: "TFSA, RRSP and FHSA contributions against starting room, projected to December 31.",
    Icon: TbWallet,
    sample: ["TFSA room remaining", "$2,100.00"],
  },
  {
    title: "Distributions",
    text: "Every payment by symbol, plus a 12-month estimate.",
    Icon: TbReceipt2,
    sample: ["Next 12 months (Estimate)", "~$46.00"],
  },
];

const safeguards: { title: string; text: string; Icon: IconType }[] = [
  {
    title: "Sign-in on SnapTrade",
    text: "Authorization happens on SnapTrade with PKCE. Brokerage credentials stay there.",
    Icon: TbLogin2,
  },
  {
    title: "Read-only",
    text: "The trading permission is never requested, so no order can be placed.",
    Icon: TbEyeCheck,
  },
  {
    title: "Encrypted tokens",
    text: "Tokens are encrypted at rest with AES-256-GCM. Balances and transactions are never stored.",
    Icon: TbLock,
  },
  {
    title: "Revocable",
    text: "Disconnect revokes access at SnapTrade and deletes the stored tokens.",
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

function IconBadge({ Icon }: { Icon: IconType }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-xl text-accent">
      <Icon aria-hidden />
    </span>
  );
}

// Rendered in the signed-out form while the session is checked, so the hero
// keeps the same layout from the first paint.
function HeroButtons({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
        {signedIn ? (
          <Link href="/accounts" className={large(buttonPrimary)}>
            Open accounts
            <TbArrowRight aria-hidden />
          </Link>
        ) : (
          <SignInLink />
        )}
        <a href="#how-it-works" className={`group ${large(buttonGlass)}`}>
          How it works
          <TbArrowDown
            aria-hidden
            className="text-muted transition-transform group-hover:translate-y-0.5 motion-reduce:transition-none"
          />
        </a>
      </div>
      {!signedIn && (
        <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted lg:justify-start">
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
        <div className="mx-auto mt-8 max-w-xl text-left lg:mx-0">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
      <HeroButtons signedIn={signedIn} />
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
      <div className="relative isolate overflow-hidden">
        <HeroBackdrop />
        <section
          className={`${container} grid items-center gap-12 pt-14 pb-14 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:py-24`}
        >
          {/* Centred while the hero is a single column; left-aligned beside the
            example window. */}
          <div className="text-center lg:text-left">
            <p className="mb-8 flex animate-rise motion-reduce:animate-none [animation-delay:0ms] items-center justify-center gap-3 lg:justify-start">
              <LogoMark className="h-11 w-11" />
              <span className="text-2xl font-semibold tracking-tight">
                Vaultfolio
              </span>
            </p>
            <h1 className="animate-rise motion-reduce:animate-none [animation-delay:80ms] text-4xl font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl">
              Monthly investing reports, in{" "}
              {/* Obsidian's app icon, exported unmodified from obsidian.md. */}
              <span className="whitespace-nowrap">
                <Image
                  src="/brand/obsidian-icon.svg"
                  alt=""
                  width={512}
                  height={512}
                  unoptimized
                  className="mr-[0.18em] inline-block size-[0.95em] rounded-[19.5%] align-[-0.14em] ring-1 ring-white/10"
                />
                <span className="text-accent">Obsidian</span>.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl animate-rise motion-reduce:animate-none [animation-delay:160ms] text-lg leading-relaxed text-muted lg:mx-0">
              Brokerage data from{" "}
              <ExternalLink href={SNAPTRADE_SITE_URL}>SnapTrade</ExternalLink>,
              turned into a factual report on contributions, registered room and
              distributions. Read it in the browser or in{" "}
              <ExternalLink href={OBSIDIAN_SITE_URL}>Obsidian</ExternalLink>.
            </p>

            <div className="animate-rise motion-reduce:animate-none [animation-delay:240ms]">
              <Suspense fallback={<HeroButtons signedIn={false} />}>
                <HeroActions searchParams={searchParams} />
              </Suspense>
            </div>

            <p className="mx-auto mt-6 max-w-xl animate-rise motion-reduce:animate-none [animation-delay:320ms] text-sm text-muted lg:mx-0">
              Requires a SnapTrade Personal account with a connected brokerage,
              managed in the <SnapTradeLink />.
            </p>
          </div>

          <div className="min-w-0 animate-rise motion-reduce:animate-none [animation-delay:200ms]">
            <ObsidianWindow
              notes={[-2, -1, 0].map((offset) => {
                const report = buildExampleReport(
                  EXAMPLE_SETTINGS,
                  addMonths(EXAMPLE_PERIOD, offset),
                );
                return {
                  title: report.fileName.replace(/\.md$/, ""),
                  document: report.document,
                  markdown: report.markdown,
                };
              })}
            />
          </div>
        </section>
      </div>

      {/* Rises in on load, just after the hero, then stays still. */}
      <div className="animate-rise motion-reduce:animate-none [animation-delay:400ms]">
        <section
          id="how-it-works"
          className="border-y border-border bg-surface"
        >
          <div className={`${container} py-14 md:py-20`}>
            <SectionHeading
              title="How it works"
              text="Vaultfolio is a SnapTrade OAuth app with an Obsidian plugin. Each part has one job."
            />
            <ol className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <li key={step.title} className={`${card} relative p-6`}>
                  <IconBadge Icon={step.Icon} />
                  <p className="mt-5 text-sm text-muted">{step.label}</p>
                  <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{step.text}</p>
                  {step.download && <PluginDownloadLink className="mt-5" />}
                  {/* Centred in the 2rem gap: half the gap plus half the arrow. */}
                  {index < steps.length - 1 && (
                    <TbArrowRight
                      aria-hidden
                      className="absolute -bottom-6.5 left-1/2 h-5 w-5 -translate-x-1/2 rotate-90 text-muted md:top-1/2 md:-right-6.5 md:bottom-auto md:left-auto md:translate-x-0 md:-translate-y-1/2 md:rotate-0"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="reports" className={`${container} py-14 md:py-20`}>
          <SectionHeading
            title="What each report contains"
            text="Facts only, never trade recommendations. Every setting is optional."
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

        <section id="security" className="border-t border-border bg-surface">
          <div
            className={`${container} grid gap-10 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]`}
          >
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Access and data handling
              </h2>
              <p className="mt-3 leading-relaxed text-muted">
                The client secret and all tokens stay on the server.
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
                Sign in with SnapTrade to generate the first report. No setup
                required.
              </p>
            </div>
            <Suspense fallback={<SignInLink />}>
              <ClosingAction />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
