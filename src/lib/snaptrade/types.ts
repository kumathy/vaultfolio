// Subsets of the response schemas in https://docs.snaptrade.com/openapi.yaml,
// limited to the fields Vaultfolio reads. Optional and nullable markers follow
// the spec; normalizers in src/lib/view-models treat every field defensively.

export interface Money {
  amount?: number;
  currency?: string;
}

// components.schemas.Account (GET /accounts)
export interface Account {
  id: string;
  brokerage_authorization: string;
  name: string | null;
  number: string;
  institution_name: string;
  raw_type?: string | null;
  account_category?: "INVESTMENT" | "DEPOSIT" | "LOC" | "ANNUITY" | null;
  status?: "open" | "closed" | "archived" | "unavailable" | null;
  is_paper: boolean;
  balance: {
    total?: Money | null;
  };
  sync_status: {
    holdings?: {
      initial_sync_completed?: boolean;
      last_successful_sync?: string | null;
    };
    transactions?: {
      initial_sync_completed?: boolean;
      last_successful_sync?: string | null;
      first_transaction_date?: string | null;
    };
  };
}

interface CurrencyObject {
  code?: string;
}

// components.schemas.Balance (GET /accounts/{id}/balances)
export interface Balance {
  currency?: CurrencyObject | null;
  // Can be negative in a margin account.
  cash?: number | null;
}

// components.schemas.AccountPosition (GET /accounts/{id}/positions/all).
// Quantities are decimal strings in this API version.
export interface AccountPosition {
  instrument?: {
    kind?: string;
    symbol?: string;
    raw_symbol?: string;
    description?: string | null;
    currency?: string | null;
  };
  units?: string | null;
  price?: string | null;
  currency?: string | null;
  cash_equivalent?: boolean | null;
}

// components.schemas.AllAccountPositionsResponse
export interface AccountPositionsResponse {
  results?: AccountPosition[];
  data_freshness?: { as_of?: string | null };
}

// components.schemas.AccountUniversalActivity (GET /accounts/{id}/activities)
export interface Activity {
  id?: string;
  symbol?: { symbol?: string; raw_symbol?: string } | null;
  price?: number | null;
  units?: number | null;
  amount?: number | null;
  currency?: CurrencyObject | null;
  type?: string;
  description?: string;
  trade_date?: string | null;
  settlement_date?: string | null;
}

// components.schemas.PaginatedUniversalActivity
export interface ActivityPage {
  data?: Activity[];
  pagination?: { offset?: number; limit?: number; total?: number };
}

// components.schemas.BrokerageAuthorization (GET /authorizations)
export interface BrokerageAuthorization {
  id?: string;
  name?: string;
  disabled?: boolean;
  disabled_date?: string | null;
  brokerage?: {
    name?: string;
    display_name?: string;
  };
}

// GET /accounts/{accountId}/balanceHistory (beta add-on): estimated daily
// total account value, up to one year back, possibly with gaps.
export interface AccountValueHistory {
  history?: { date?: string; total_value?: string | number | null }[];
  currency?: string | null;
}
