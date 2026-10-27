import { formatMoney } from "@/lib/format";
import type { AccountView, MoneyView } from "@/lib/view-models/accounts";

const headCell = "pb-2 text-left text-sm font-medium text-muted";
const bodyCell = "border-t-2 border-border py-3 align-top";

export function AccountTable({ accounts }: { accounts: AccountView[] }) {
  return (
    <table className="w-full tabular-nums">
      <caption className="sr-only">Connected brokerage accounts</caption>
      <thead>
        <tr>
          <th scope="col" className={headCell}>
            Account
          </th>
          <th scope="col" className={`${headCell} hidden sm:table-cell`}>
            Type
          </th>
          <th scope="col" className={`${headCell} hidden sm:table-cell`}>
            Holdings synced
          </th>
          <th scope="col" className={`${headCell} text-right`}>
            Value
          </th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <tr key={account.id}>
            <td className={`${bodyCell} pr-4`}>
              <span className="font-medium">{account.name}</span>
              <span className="block text-sm text-muted">
                {account.institution}
                {account.numberSuffix && ` ••${account.numberSuffix}`}
                <span className="sm:hidden"> · {account.type}</span>
              </span>
            </td>
            <td className={`${bodyCell} hidden pr-4 sm:table-cell`}>
              {account.type}
              {account.isPaper && (
                <span className="block text-sm text-muted">Paper</span>
              )}
            </td>
            <td className={`${bodyCell} hidden pr-4 sm:table-cell`}>
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
  );
}

export function CurrencyTotals({ totals }: { totals: MoneyView[] }) {
  return (
    <table className="w-full tabular-nums">
      <caption className="sr-only">Total value by currency</caption>
      <thead>
        <tr>
          <th scope="col" className={headCell}>
            Currency
          </th>
          <th scope="col" className={`${headCell} text-right`}>
            Total value
          </th>
        </tr>
      </thead>
      <tbody>
        {totals.map((total) => (
          <tr key={total.currency}>
            <td className={bodyCell}>{total.currency}</td>
            <td className={`${bodyCell} text-right whitespace-nowrap`}>
              {formatMoney(total.amount, total.currency)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
