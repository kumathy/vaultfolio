import {
  TbAlertTriangle,
  TbCircleCheck,
  TbFolder,
  TbHelpCircle,
} from "react-icons/tb";
import { card, chip } from "@/components/ui";
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
    return (
      <span className={chip}>
        <TbHelpCircle aria-hidden className="text-sm" />
        Connection status unavailable
      </span>
    );
  }
  const disabled = connections.filter((c) => c.disabled).length;
  if (disabled > 0) {
    return (
      <span
        className={`${chip} border-attention/30 bg-attention-soft text-attention`}
      >
        <TbAlertTriangle aria-hidden className="text-sm" />
        {disabled === 1
          ? "1 connection needs attention"
          : `${disabled} connections need attention`}
      </span>
    );
  }
  return (
    <span
      className={`${chip} border-positive/30 bg-positive-soft text-positive`}
    >
      <TbCircleCheck aria-hidden className="text-sm" />
      SnapTrade connected
    </span>
  );
}

function Tile({
  label,
  value,
  detail,
}: {
  label: React.ReactNode;
  value: string;
  detail: string;
}) {
  return (
    <div className={`${card} p-5`}>
      <p className="flex items-center gap-2 text-sm text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{detail}</p>
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {totals.map((total) => (
        <Tile
          key={total.currency}
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

const headCell = "px-5 py-3 text-left text-xs font-medium text-muted";
const bodyCell = "border-t border-border px-5 py-4 align-middle";

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
    <div className="space-y-6">
      {groupByInstitution(accounts).map((group) => (
        <section
          key={group.institution}
          aria-label={group.institution}
          className={`${card} overflow-hidden`}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
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
          <table className="w-full tabular-nums">
            <caption className="sr-only">
              Accounts at {group.institution}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={headCell}>
                  Account
                </th>
                <th scope="col" className={`${headCell} hidden sm:table-cell`}>
                  Type
                </th>
                <th scope="col" className={`${headCell} hidden md:table-cell`}>
                  Holdings synced
                </th>
                <th scope="col" className={`${headCell} text-right`}>
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
                    <span className="font-medium">{account.name}</span>
                    {account.numberSuffix && (
                      <span className="ml-2 text-sm text-muted">
                        ••{account.numberSuffix}
                      </span>
                    )}
                    <span className="mt-1.5 block sm:hidden">
                      <TypePill account={account} />
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
