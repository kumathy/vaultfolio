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
    };
  };
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
