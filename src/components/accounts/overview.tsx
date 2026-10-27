import { TbFolder } from "react-icons/tb";
import { SnapTradeBadge } from "@/components/snaptrade";
import { card } from "@/components/ui";
import { formatAmount, formatMoney } from "@/lib/format";
import {
  groupByInstitution,
  type AccountView,
  type ConnectionView,
  type MoneyView,
} from "@/lib/view-models/accounts";

export function ConnectionChip({
  connections,
}: {
  connections: ConnectionView[] | null;
}) {
  if (connections === null) {
    return <SnapTradeBadge status="unknown" label="Status unavailable" />;
  }
  const disabled = connections.filter((c) => c.disabled).length;
  if (disabled > 0) {
    return (
      <SnapTradeBadge
        status="attention"
        label={
          disabled === 1
            ? "1 connection needs attention"
            : `${disabled} connections need attention`
        }
      />
    );
  }
  return <SnapTradeBadge status="connected" label="Connected" />;
}

function Tile({
  label,
  value,
  detail,
  wide = false,
}: {
  label: React.ReactNode;
  value: string;
  detail: string;
  wide?: boolean;
}) {
  return (
    <div
      className={`${card} min-w-0 p-4 sm:p-5 ${wide ? "col-span-2 sm:col-span-1" : ""}`}
    >
      <p className="flex items-center gap-2 text-sm text-muted">{label}</p>
      <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums sm:mt-3 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted sm:text-sm">{detail}</p>
    </div>
  );
}

export function StatTiles({
  accounts,
  connections,
  totals,
}: {
  accounts: AccountView[];
  connections: ConnectionView[] | null;
  totals: MoneyView[];
}) {
  const institutions = new Set(accounts.map((a) => a.institution)).size;
  const active = connections?.filter((c) => !c.disabled).length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {totals.map((total) => (
        <Tile
          key={total.currency}
          wide
          label={
            <>
              Total value
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
                {total.currency}
              </span>
            </>
          }
          value={formatAmount(total.amount, total.currency)}
          detail="Sum of reported account values"
        />
      ))}
      <Tile
        label="Accounts"
        value={String(accounts.length)}
        detail={
          institutions === 1
            ? "At 1 institution"
            : `At ${institutions} institutions`
        }
      />
      <Tile
        label="Connections"
        value={
          connections === null ? "—" : `${active} of ${connections.length}`
        }
        detail={
          connections === null ? "Status unavailable" : "Active in SnapTrade"
        }
      />
    </div>
  );
}

const headCell = "px-4 py-3 text-left text-xs font-medium text-muted sm:px-5";
const bodyCell =
  "border-t border-border px-4 py-3.5 align-middle sm:px-5 sm:py-4";

function TypePill({ account }: { account: AccountView }) {
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
        {account.type}
      </span>
      {account.isPaper && (
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
          Paper
        </span>
      )}
    </span>
  );
}

export function AccountGroups({ accounts }: { accounts: AccountView[] }) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {groupByInstitution(accounts).map((group) => (
        <section
          key={group.institution}
          aria-label={group.institution}
          className={`${card} overflow-hidden`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-5">
            <h3 className="flex items-center gap-2 font-medium">
              <TbFolder aria-hidden className="text-lg text-accent" />
              {group.institution}
            </h3>
            <span className="text-sm text-muted">
              {group.accounts.length === 1
                ? "1 account"
                : `${group.accounts.length} accounts`}
            </span>
          </header>
          {/* Fixed layout with set widths keeps columns aligned across institution cards. */}
          <table className="w-full table-fixed tabular-nums">
            <caption className="sr-only">
              Accounts at {group.institution}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={headCell}>
                  Account
                </th>
                <th
                  scope="col"
                  className={`${headCell} hidden w-44 sm:table-cell`}
                >
                  Type
                </th>
                <th
                  scope="col"
                  className={`${headCell} hidden w-44 md:table-cell`}
                >
                  Holdings synced
                </th>
                <th
                  scope="col"
                  className={`${headCell} w-36 text-right sm:w-48`}
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {group.accounts.map((account) => (
                <tr
                  key={account.id}
                  className="transition-colors hover:bg-surface/60"
                >
                  <td className={bodyCell}>
                    <span className="block font-medium break-words sm:inline">
                      {account.name}
                    </span>
                    {account.numberSuffix && (
                      <span className="hidden text-sm text-muted sm:ml-2 sm:inline">
                        ••{account.numberSuffix}
                      </span>
                    )}
                    <span className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
                      <TypePill account={account} />
                      {account.numberSuffix && (
                        <span className="text-sm text-muted">
                          ••{account.numberSuffix}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${bodyCell} hidden sm:table-cell`}>
                    <TypePill account={account} />
                  </td>
                  <td className={`${bodyCell} hidden text-sm md:table-cell`}>
                    {account.holdingsSyncedOn ?? (
                      <span className="text-muted">Not reported</span>
                    )}
                  </td>
                  <td className={`${bodyCell} text-right whitespace-nowrap`}>
                    {account.total ? (
                      formatMoney(account.total.amount, account.total.currency)
                    ) : (
                      <span className="text-muted">Not reported</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
