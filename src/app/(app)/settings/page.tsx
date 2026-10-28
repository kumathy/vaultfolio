import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TbChevronDown } from "react-icons/tb";
import { AccessSection } from "@/components/settings/access-section";
import { AccountTypesForm } from "@/components/settings/account-types-form";
import { ObsidianSection } from "@/components/settings/obsidian-section";
import { AllocationForm } from "@/components/settings/allocation-form";
import { SettingsSection } from "@/components/settings/form-kit";
import { OptionsForm } from "@/components/settings/options-form";
import { SetupForm } from "@/components/settings/setup-form";
import { TransfersForm } from "@/components/settings/transfers-form";
import { ExternalLink } from "@/components/external-link";
import { card } from "@/components/ui";
import { loadSettings } from "@/db/settings";
import { listPluginTokens } from "@/db/plugin";
import { verifiedEmail } from "@/db/users";
import { deleteAllSessions, requireUserId } from "@/lib/auth/session";
import { accountLabel } from "@/lib/reports/context";
import { money } from "@/lib/reports/money";
import { localDate } from "@/lib/reports/period";
import { resolveSettings, type RegisteredType } from "@/lib/reports/types";
import { tokenDeps } from "@/lib/snaptrade/config";
import { loadReportAccounts } from "@/lib/snaptrade/report";
import { ReauthorizationRequired } from "@/lib/snaptrade/tokens";

export const metadata: Metadata = { title: "Settings" };

const TRANSFER_TYPES = new Set(["TRANSFER", "EXTERNAL_ASSET_TRANSFER_IN"]);

async function SettingsContent() {
  const userId = await requireUserId();
  const settings = await loadSettings(userId);
  const resolved = resolveSettings(settings);
  const year = Number(localDate(new Date(), resolved.timeZone).slice(0, 4));

  let accounts;
  try {
    accounts = await loadReportAccounts(tokenDeps, userId, settings);
  } catch (error) {
    if (!(error instanceof ReauthorizationRequired)) throw error;
    await deleteAllSessions(userId);
    redirect("/?error=reauthorize");
  }

  const labelled = accounts.map((a) => ({
    ...a,
    display: accountLabel(a, accounts),
  }));
  const heldTypes = (["TFSA", "RRSP", "FHSA"] as const).filter((type) =>
    accounts.some((a) => a.registeredType === type),
  );
  const room: Partial<Record<RegisteredType, number>> = {};
  for (const [type, entry] of Object.entries(settings.room ?? {})) {
    if (entry && entry.year === year)
      room[type as RegisteredType] = entry.availableCents;
  }

  const transfers = labelled
    .filter((a) => a.registeredType !== null)
    .flatMap((a) =>
      (a.activities ?? [])
        .filter(
          (t) =>
            TRANSFER_TYPES.has(t.type.toUpperCase()) &&
            t.amountCents > 0 &&
            t.currency,
        )
        .map((t) => ({
          id: t.id,
          date: t.date,
          account: a.display,
          amount: money(t.amountCents, t.currency!, resolved.baseCurrency),
          counted: settings.activityKinds?.[t.id] === "contribution",
        })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <SettingsSection
        id="setup"
        title="Report setup"
        description={
          <>
            Both are optional. Starting room enables remaining room and
            over-contribution checks; it is shown in{" "}
            <ExternalLink href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html">
              CRA My Account
            </ExternalLink>{" "}
            and cannot be retrieved automatically. The monthly target is a total
            for the month, however often deposits are made.
          </>
        }
      >
        <SetupForm
          year={year}
          types={heldTypes}
          room={room}
          contributionTargetCents={settings.contributionTargetCents}
        />
      </SettingsSection>

      <details className="group">
        <summary
          className={`${card} flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition-colors hover:border-muted sm:px-6 [&::-webkit-details-marker]:hidden`}
        >
          <span>
            <span className="block font-semibold">Advanced settings</span>
            <span className="mt-0.5 block text-sm text-muted">
              Target allocation, account types, transfers, uninvested cash and
              time zone.
            </span>
          </span>
          <TbChevronDown
            aria-hidden
            className="shrink-0 text-lg text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>

        <div className="mt-6 space-y-6">
          <SettingsSection
            id="allocation"
            title="Target allocation"
            description="Adds target and weight-versus-target columns to Holdings. Useful when contributions are split across several funds."
          >
            <AllocationForm
              targets={{
                allocation: settings.allocation,
                scopeAccountIds: settings.scopeAccountIds,
              }}
              accounts={labelled.map((a) => ({ id: a.id, label: a.display }))}
            />
          </SettingsSection>

          <SettingsSection
            id="accounts"
            title="Account types"
            description="Types come from the brokerage when available. A TFSA, RRSP or FHSA tag includes the account in room tracking."
          >
            <AccountTypesForm
              accounts={labelled.map((a) => ({
                id: a.id,
                label: a.display,
                institution: a.institution,
                brokerageType: a.label,
                tag: settings.accountTypes?.[a.id],
              }))}
            />
          </SettingsSection>

          {transfers.length > 0 && (
            <SettingsSection
              id="transfers"
              title="Transfers into registered accounts"
              description="Transfers from another registered account do not use new room, so they are not counted as contributions. A transfer from a non-registered account is a contribution and can be marked here."
            >
              <TransfersForm transfers={transfers} />
            </SettingsSection>
          )}

          <SettingsSection
            id="options"
            title="Report options"
            description="When uninvested cash is flagged, and the time zone that defines each month."
          >
            <OptionsForm
              days={resolved.uninvestedCashDays}
              thresholdCents={resolved.uninvestedCashThresholdCents}
              timeZone={resolved.timeZone}
            />
          </SettingsSection>
        </div>
      </details>
    </div>
  );
}

async function Obsidian() {
  const userId = await requireUserId();
  const [vaults, settings] = await Promise.all([
    listPluginTokens(userId),
    loadSettings(userId),
  ]);
  return (
    <ObsidianSection
      vaults={vaults}
      timeZone={resolveSettings(settings).timeZone}
    />
  );
}

async function Access() {
  const userId = await requireUserId();
  return <AccessSection email={await verifiedEmail(userId)} />;
}

function SettingsLoading({ count = 3 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${card} h-48 animate-pulse bg-surface`} />
      ))}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every setting is optional. Reports note what is not configured instead
          of blocking.
        </p>
      </div>
      <Suspense fallback={<SettingsLoading />}>
        <SettingsContent />
      </Suspense>
      <Suspense fallback={<SettingsLoading count={1} />}>
        <Obsidian />
      </Suspense>
      <Suspense fallback={<AccessSection email={null} />}>
        <Access />
      </Suspense>
    </div>
  );
}
