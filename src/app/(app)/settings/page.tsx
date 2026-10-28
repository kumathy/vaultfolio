import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccessActions } from "@/components/settings/access-section";
import { AccountTypesForm } from "@/components/settings/account-types-form";
import { SettingsSection } from "@/components/settings/form-kit";
import { OptionsForm } from "@/components/settings/options-form";
import { RoomForm } from "@/components/settings/room-form";
import { TargetsForm } from "@/components/settings/targets-form";
import { TransfersForm } from "@/components/settings/transfers-form";
import { ExternalLink } from "@/components/external-link";
import { card } from "@/components/ui";
import { loadSettings } from "@/db/settings";
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
        id="targets"
        title="Targets"
        description="A monthly contribution total and a target allocation. Both are optional and work with any deposit schedule, automatic or manual. The contribution target is also used to project registered room through December."
      >
        <TargetsForm
          targets={{
            contributionTargetCents: settings.contributionTargetCents,
            allocation: settings.allocation,
            scopeAccountIds: settings.scopeAccountIds,
          }}
          accounts={labelled.map((a) => ({ id: a.id, label: a.display }))}
        />
      </SettingsSection>

      <SettingsSection
        id="room"
        title={`Starting room — ${year}`}
        description={
          <>
            Room available at the start of the year, as shown in{" "}
            <ExternalLink href="https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-individuals/account-individuals.html">
              CRA My Account
            </ExternalLink>
            . It cannot be retrieved automatically. Reports subtract
            contributions made since January 1.
          </>
        }
      >
        <RoomForm year={year} room={room} />
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

      <SettingsSection
        id="transfers"
        title="Transfers into registered accounts"
        description="Transfers from another registered account do not use new room, so they are not counted as contributions. A transfer from a non-registered account is a contribution and can be marked here."
      >
        <TransfersForm transfers={transfers} />
      </SettingsSection>

      <SettingsSection
        id="options"
        title="Report options"
        description="When idle cash is flagged, and the time zone that defines each month."
      >
        <OptionsForm
          days={resolved.uninvestedCashDays}
          thresholdCents={resolved.uninvestedCashThresholdCents}
          timeZone={resolved.timeZone}
        />
      </SettingsSection>
    </div>
  );
}

function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-6">
      {[0, 1, 2].map((i) => (
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
      <SettingsSection
        id="access"
        title="Access"
        description="This browser session and Vaultfolio’s access to SnapTrade."
      >
        <AccessActions />
      </SettingsSection>
    </div>
  );
}
