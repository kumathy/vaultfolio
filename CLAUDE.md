# Vaultfolio

Vaultfolio is a web app and Obsidian plugin that turns brokerage data from SnapTrade into structured Markdown investing reports. Reports are viewable in the browser and sync into an Obsidian vault.

## Working agreement

The developer is a new CS graduate with SDET and SWE experience (TypeScript, React, Java) who is new to OAuth and web security. Every decision must be understandable and defensible in a technical interview.

- Work in small phases. Complete one phase, explain it, then stop and wait for approval.
- For each new file, explain in plain language what it does and why it exists.
- For OAuth and security code (state, PKCE, nonce, tokens, cookies, encryption), add a short comment naming the attack it prevents.
- Ask before adding a dependency, and state why it is needed.
- Prefer simple, readable code over clever code.
- Never request secrets in chat. Secrets are entered by the developer directly into `.env.local`.

## Context and requirements

The project is a submission for SnapTrade's Product Engineer hiring process. SnapTrade reviews the hosted app, then holds a technical deep dive covering design choices, implementation, and possible improvements.

Requirements:
- Built as a SnapTrade **OAuth app**: SnapTrade Personal users grant access to their accounts.
- **Publicly hosted**, with the deployed callback URL registered in the OAuth configuration.
- **Client secret stays on the backend**: never in browser code or the Obsidian plugin.
- **Fully usable without Obsidian.** Reviewers sign in with their own SnapTrade accounts (possibly with sandbox data) and may not use Obsidian.

## Product

### Primary use case
A beginner investor making automatic monthly contributions to an all-in-one ETF (XEQT) in a TFSA, who keeps notes in Obsidian. This is the main test case, not an assumption built into the code: users may hold other ETFs (VFV, VEQT), several funds at once, or individual stocks.

### Principles
- **Describe, don't advise.** Reports state facts (for example, "TFSA room remaining: $2,100.00") and never make buy or sell recommendations. The app shows a short disclaimer.
- **Works with zero setup.** Every setting is optional (see below).
- **Generic by design.** No ticker symbol is hard-coded in logic.

### MVP features
1. **Plan check.** Confirms this month's deposit arrived and was invested in the plan's holdings. Flags cash left uninvested for more than N days (configurable, default 5).
2. **Contributions and growth.** Total contributed versus current value, where growth = current value − total contributions. Percentage returns are avoided because recurring deposits make them misleading.
3. **Registered-account room tracking (TFSA, RRSP, FHSA).** Starting room is entered by the user (from CRA My Account, which cannot be fetched) and is optional. The app tracks contributions from that point, shows remaining room, and projects whether scheduled contributions will exceed it before December 31. Rules:
   - TFSA withdrawals are added back to room on **January 1 of the following year**, not immediately.
   - FHSA: $8,000 per year and $40,000 lifetime. Room accumulates only once the account is opened, and the deadline follows the calendar year.
   - RRSP: user-entered deduction limit, with a deadline about 60 days into the following year.
   - Yearly dollar limits live in one config file, `src/lib/limits.ts`, not in logic. 2026 values: TFSA $7,000; RRSP maximum $33,810 (deadline March 1, 2027); FHSA $8,000 per year, $40,000 lifetime.
   - Transfers in from another registered account are not new contributions. Classification must be careful, and users can correct it.
4. **Distribution history and projection.** History per payment and per symbol. Projection = (sum of per-unit distributions over the trailing 12 months) × units currently held, per symbol. This works for any payment frequency (XEQT quarterly, VEQT annually, some funds monthly). Always labelled as an estimate.

### Zero-setup behaviour
A user who signs in and configures nothing still receives a useful report. Settings add detail. They never block the report, and the app never shows a setup wall or a blank page.

| Setting not provided | Report behaviour |
| --- | --- |
| Starting contribution room | Shows contributions and withdrawals year-to-date per registered account, plus that year's annual limit for reference. Remaining room, projection, and over-contribution status show **Not configured**. No warnings are raised, since over-contribution cannot be determined without starting room. |
| Plan (amount, day, target holdings) | Lists deposits and purchases observed this month. Plan execution status shows **Not configured**. Target and weight-versus-target columns are omitted. |
| Account type tags | Uses the account type reported by the brokerage when available. Otherwise the account is labelled "Unclassified" and excluded from the room section. |
| Uninvested-cash threshold | Defaults to 5 days. |

- Missing configuration is noted impersonally, once per report, e.g. `> [!info] Remaining room is not calculated: starting room has not been configured in Vaultfolio settings.`
- Unknown frontmatter values are `null` (e.g. `tfsa_room_remaining: null`, `plan_status: not-configured`). `0` is never used for an unknown value, because it means "no room remaining."
- The web dashboard may show a single dismissible "Add starting room" prompt in settings. It never blocks anything.

Example room section without starting room configured:

```markdown
## Registered account room — 2026

| Account | Contributed YTD | Withdrawn YTD | Remaining      | Status         |
| ------- | --------------: | ------------: | -------------- | -------------- |
| TFSA    |       $4,900.00 |         $0.00 | Not configured | Not configured |

2026 annual TFSA limit, for reference: $7,000.00. Actual available room also includes unused room carried forward from previous years.

> [!info] Remaining room is not calculated: starting room has not been configured in Vaultfolio settings.
```

### Holdings and currency handling
- The plan lives in user settings: monthly amount, contribution day, and holdings with target weights (default: `XEQT 100%`).
- Calculations run per symbol and per account, then roll up.
- Amounts are grouped and subtotalled by currency. No currency conversion in the MVP, because there is no FX data source and an incorrect conversion is worse than none.
- Test fixtures cover: a single all-in-one fund (XEQT), two funds (XEQT + VFV), a USD-denominated position, an individual stock, and a cash-only account.

### Post-MVP features
Built only after the MVP is complete and tested.
- Consistency record: consecutive months the plan executed, including how many had negative portfolio returns. Presented as a statistic, not praise.
- Fee estimate in dollars: fund MER × average balance. MERs are user-entered per symbol (e.g. XEQT 0.20%), since SnapTrade does not provide them.
- Allocation drift: current versus target weights for multi-fund plans. Read-only; never places orders.
- Individual-stock views: concentration and per-position gain or loss. Before designing this, check whether positions include an average purchase price.
- Currency-converted totals, once a reliable FX source is available.
- Calendar notes: January 1 TFSA room, RRSP deadline, FHSA December 31.
- One-line summary appended to the Obsidian daily note.
- Webhooks (`ACCOUNT_TRANSACTIONS_UPDATED`) to regenerate reports.

## Report specification

### Writing style
Reports read as a professional financial statement.
- **No reader address.** Never use "you", "your", "we", "I", or "let's". Write "TFSA room remaining: $2,100.00", not "You have $2,100 left".
- Neutral and factual: no exclamation marks, emoji, encouragement, or advice.
- Status labels: **On track**, **Attention**, **Not applicable**, **Not configured**.
- Structure: a summary callout first, then short sections in a fixed order, tables for figures, and one idea per line.
- Numbers use two decimals and thousands separators, with right-aligned numeric columns. Include a currency code when an account isn't in the report's base currency. Dates use ISO format (2026-10-02).
- Estimates are labelled "Estimate" and state their method in one line.
- `> [!warning]` callouts flag items needing attention. `> [!info]` callouts note data caveats, such as one-day transaction delays or an account that failed to load.
- Footer: retrieval time, source (SnapTrade), and "For information only. Not financial advice."
- The web dashboard renders the same Markdown, so the same rules apply there.

### Frontmatter
Each monthly report begins with YAML frontmatter for Dataview queries. Keys are `snake_case`, and values are plain numbers or strings with no currency symbols.

### Reference example (illustrative figures)

```markdown
---
type: investing-report
period: 2026-10
generated_at: 2026-10-27T09:14:00-03:00
base_currency: CAD
portfolio_value: 4312.55
total_contributed: 3900.00
net_growth: 412.55
plan_status: on-track
tfsa_room_remaining: 2100.00
distributions_ttm: 38.20
---

# Investing Report — October 2026

> [!summary] Summary
> Monthly plan executed on schedule. Portfolio value: **$4,312.55** against **$3,900.00** contributed (net growth **+$412.55**). TFSA room remaining for 2026: **$2,100.00**.

## Plan execution

| Check               | Status   | Detail                                   |
| ------------------- | -------- | ---------------------------------------- |
| Deposit received    | On track | $300.00 on 2026-10-01                    |
| Invested per plan   | On track | 9 units XEQT purchased on 2026-10-02     |
| Uninvested cash     | On track | $4.12 (below $25.00 threshold)           |

## Contributions and growth

| Measure           |     Amount |
| ----------------- | ---------: |
| Total contributed |  $3,900.00 |
| Current value     |  $4,312.55 |
| Net growth        |   +$412.55 |

## Holdings

| Account     | Symbol | Units |     Value | Weight | Target |
| ----------- | ------ | ----: | --------: | -----: | -----: |
| TFSA (WS)   | XEQT   | 115.0 | $4,308.43 | 100.0% | 100.0% |
| TFSA (WS)   | Cash   |     — |     $4.12 |   0.0% |      — |

## Registered account room — 2026

| Account | Available at Jan 1 | Contributed YTD | Remaining | Projected at Dec 31 | Status   |
| ------- | -----------------: | --------------: | --------: | ------------------: | -------- |
| TFSA    |          $7,000.00 |       $4,900.00 | $2,100.00 |           $1,500.00 | On track |

Projection assumes the scheduled $300.00 monthly contribution continues through December.

## Distributions

| Paid on    | Symbol | Per unit |  Amount |
| ---------- | ------ | -------: | ------: |
| 2026-09-29 | XEQT   |  $0.1000 |  $11.40 |
| 2026-06-27 | XEQT   |  $0.0900 |   $9.45 |

| Measure                          |  Amount |
| -------------------------------- | ------: |
| Trailing 12 months               |  $38.20 |
| Next 12 months (Estimate)        | ~$46.00 |

Estimate method: trailing-12-month distributions per unit × units currently held.

> [!info] Data notes
> Transactions are reported by the brokerage with a one-day delay.

---
*Data retrieved 2026-10-27 09:14 ADT via SnapTrade. For information only. Not financial advice.*
```

## Architecture

```
Obsidian plugin  ──(plugin token)──▶  Web app (Next.js on Vercel)  ──(OAuth access token)──▶  SnapTrade API
                                            │
                                            └──▶ Web dashboard (report preview + .md download)
```

- **Only the web app holds SnapTrade tokens and the client secret.**
- The plugin is intentionally thin: it downloads rendered reports and writes them to a vault folder.

### Tech stack
- **Framework:** Next.js (App Router) with TypeScript.
- **Hosting:** Vercel (Hobby plan).
- **Database:** Neon Postgres (free tier), provisioned through the Vercel marketplace.
- **Tests:** Vitest.
- **ID token verification:** `jose`, using JWKS.
- **Data access:** a lightweight ORM such as Drizzle, for users, encrypted tokens, settings, and plugin tokens. Confirm before adding.
- **OAuth flow state** (`state`, `code_verifier`, `nonce`): an encrypted, httpOnly cookie session.
- **Obsidian plugin:** in `obsidian-plugin/`, based on the official sample plugin template (TypeScript + esbuild).

Hosting rationale:
- **Vercel over Render.** Render's free web services sleep after 15 idle minutes and take about a minute to wake, and its free Postgres expires after 30 days.
- **Not GitHub Pages.** Pages is static-only and cannot keep a client secret.
- **Neon over Supabase.** Supabase free projects pause after a week of inactivity.
- **Logs.** Vercel Hobby keeps runtime logs for one hour, so check them promptly when debugging.

### Repository layout
```
src/
  app/                    # Next.js routes and pages
  lib/
    snaptrade/            # OAuth client, token store, API fetch helper
    reports/              # Pure functions: data in → Markdown out (no network, no DB)
    limits.ts             # Yearly registered-account limits
  db/                     # Schema and queries
tests/
  fixtures/               # Sample SnapTrade responses
obsidian-plugin/
```

## SnapTrade integration rules

Follow SnapTrade's Build with AI guide (https://docs.snaptrade.com/docs/build-with-ai.md). That guide targets apps using a Personal API key. Vaultfolio is an OAuth app, so the following adaptations apply.

### Adaptations for OAuth
- **Authentication:** do not use `SnaptradeAuth.personalApiKey` or a Personal consumer key. Send the OAuth access token as `Authorization: Bearer <token>`. Inspect the installed `snaptrade-typescript-sdk` types to see whether Bearer auth is supported. If it is, use the SDK. If not, use a small server-only `fetch` wrapper typed from the OpenAPI spec. Report the finding before building.
- **Environment variables:** `SNAPTRADE_OAUTH_CLIENT_ID` and `SNAPTRADE_OAUTH_CLIENT_SECRET`.
- **Demo mode:** never substitute sample data when a real request fails. Demo mode is a separate, explicitly selected mode ("Try with sample data"), labelled on every page and never mixed with real data.
- **Access control:** every data route checks the session. Plugin routes check the plugin token.

### General rules
- Do not call `registerSnapTradeUser`, and never create or pass a `userId` or `userSecret`.
- Do not implement Commercial request signing.
- **Read-only:** no endpoint that places, modifies, or cancels orders, and no `trade` scope.
- SnapTrade code lives in server-only modules (`import "server-only"`). Never expose tokens, the client secret, the client instance, or environment variables to the browser. Never use `NEXT_PUBLIC_` for secrets.
- **No persistence of raw brokerage responses.** Store only encrypted OAuth tokens, user settings, account tags, and hashed plugin tokens. Generate reports on demand from live API data.
- **Partial failures:** fetch independent accounts concurrently with `Promise.allSettled`. Keep the sections that loaded and show a visible partial-data message for any that failed.
- **UI states:** loading, empty, partial-data, stale-data, and error. Show when the app retrieved the data, and don't call it the brokerage's last sync unless the API provides that value.
- **Currency:** format each amount in the currency the API reports. Never assume a single currency.
- **Verify, don't guess:** inspect SDK types and method signatures before use. Relevant calls: `listUserAccounts`, `getUserAccountBalance`, `getAllAccountPositions`, `getAccountActivities`, `getUserAccountRecentOrders`, and `listBrokerageAuthorizations` (for connection status, with a link to the SnapTrade Dashboard for broken connections).
- **View models:** normalize API responses into small view models before rendering or generating Markdown.
- **Rendering:** portfolio pages render dynamically, not at build time.
- **Logging and analytics:** never log full API responses or request/response bodies. No third-party analytics, session replay, or error reporting on financial pages.
- **Secrets file:** `.env.local` must be git-ignored (verify with `git check-ignore .env.local`). `.env.example` contains variable names only.
- **Financial calculations:** test totals, signs, currencies, dates, and missing values against known examples.
- **Layout and accessibility:** responsive on desktop and mobile, with basic accessibility.
- **End of each phase:** run formatting, linting, type checking, and tests.
- **Before editing files in a new phase, present:**
  1. The proposed file structure.
  2. The SnapTrade calls to be used.
  3. What runs on the server and what runs in the browser.
  4. Any assumptions needing confirmation.

## OAuth implementation requirements

References:
- OAuth app guide: https://docs.snaptrade.com/docs/oauth-apps.md
- Docs index: https://docs.snaptrade.com/llms.txt and https://docs.snaptrade.com/llms-full.txt
- OpenAPI spec: https://docs.snaptrade.com/openapi.yaml
- Account data: https://docs.snaptrade.com/docs/account-data.md
- Syncing and freshness: https://docs.snaptrade.com/docs/syncing.md
- Webhooks: https://docs.snaptrade.com/docs/webhooks.md

Requirements:
- **Endpoint discovery:** read endpoints from `https://api.snaptrade.com/.well-known/openid-configuration` rather than hard-coding them.
- **Authorization code flow with PKCE (S256):**
  - Generate a fresh `state`, `code_verifier`, and `nonce` for each attempt.
  - Store them server-side in the session, and delete them after the callback.
- **Scopes:** `openid email read`. Add `webhook` only when webhooks are built. Never request `trade`.
- **Callback:** reject a missing or mismatched `state`, and handle `error=access_denied` gracefully.
- **Token exchange:** backend only, with HTTP Basic auth (client_id:client_secret) and an `application/x-www-form-urlencoded` body.
- **ID token verification** with `jose`:
  - RS256 signature via JWKS. Cache the JWKS and refetch on an unknown `kid`.
  - Check `iss = https://api.snaptrade.com`, `aud = client_id`, `exp`, and `nonce`.
  - Key users on the `sub` claim.
  - Trust `email` only when `email_verified` is true.
- **API calls:** send only `Authorization: Bearer <access_token>`. Omit clientId, consumerKey, userId, userSecret, timestamp, and Signature, even where the API reference lists them as required.
- **Token lifecycle:**
  - Access tokens last 10 hours.
  - Refresh tokens rotate, so store the new one atomically after every refresh.
  - On a 401, refresh once and retry once. If that fails, clear the tokens and send the user to re-authorize.
- **Token security:** encrypt tokens at rest (AES-256-GCM, key from environment). Never log authorization codes, tokens, ID tokens, or the client secret.
- **Disconnect:** revoke the refresh token at the revocation endpoint, then delete the stored tokens.
- **Edge cases:**
  - Handle consent denial, users with no connected accounts, and sparse data such as the SnapTrade Sandbox brokerage.
  - Offer the explicitly selected demo mode described above.
- **Broken connections:** link users to https://dashboard.snaptrade.com to add or repair them.

### Data notes
- **Activities:** synced once daily with a one-day delay, and often date-only.
- **Sign convention:** a positive `amount` is cash in and a negative one is cash out. A BUY has positive units and a negative amount.
- **Activity types:** rely on `amount`, `units`, `price`, and `symbol`, plus the common types (BUY, SELL, CONTRIBUTION, WITHDRAWAL, DIVIDEND/distribution, FEE). Verify type names against the OpenAPI spec and real responses.
- **Account type:** verify whether accounts expose a type (TFSA, RRSP, FHSA). If not reliably, let users tag accounts in settings.
- **Prices:** SnapTrade does not provide historical price series. MVP features must not depend on them.

## Obsidian plugin pairing flow

1. Plugin settings → **Connect** opens `https://<app>/pair` in the browser.
2. After SnapTrade sign-in, the app creates a **one-time, short-lived pairing code** and redirects to `obsidian://vaultfolio?code=...`.
3. The plugin registers `registerObsidianProtocolHandler('vaultfolio', ...)`, receives the code, and exchanges it via Obsidian's `requestUrl` for a **plugin token**.
4. The plugin token can only fetch rendered reports. It is revocable from the web dashboard and stored hashed on the server.
5. Plugin settings are stored in `data.json` inside the vault, which may be synced or committed to git. The plugin token is therefore treated as low-trust, and SnapTrade tokens are never stored there.
6. The plugin fetches reports on startup and via the command "Vaultfolio: Sync now", writing them to a configurable folder (default `Investing/`). Reports are generated on demand per request, and no copy is stored on the server.

## Testing

- **Report engine:** report generation in `src/lib/reports/` is pure functions, unit tested with fixtures. Edge cases:
  - Data shape: no accounts, cash-only account, multiple funds, mixed currencies, individual stocks, zero distributions.
  - Plan behaviour: missed month, uninvested cash.
  - Room tracking: TFSA withdrawal followed by re-contribution the next year, transfer-in versus contribution, over-contribution projection.
  - Settings: none configured, starting room missing with plan set, plan missing with starting room set.
- **Style guard:** a test fails if report Markdown contains reader-addressing words ("you", "your", "we") or exclamation marks.
- **OAuth:** mismatched state, consent denied, expired code, refresh-token rotation, forced 401, and revocation.

## Build phases

Stop after each phase for review.

1. **Scaffold and SnapTrade sign-in:**
   - Next.js app with `/login` and `/oauth/snaptrade/callback`.
   - Session, token storage, a working `GET /accounts`, and Disconnect.
   - Deploy to Vercel. This phase alone is a valid submission.
2. **Report engine:** pure functions and tests for MVP features 1–4, using fixtures first and real data second.
3. **Web dashboard:**
   - Settings: starting room, account tags, plan amount and day.
   - Report preview.
   - `.md` download, single file and zip.
4. **Obsidian plugin** and pairing flow.
5. **README for reviewers:** purpose, architecture, security decisions, tradeoffs, and planned improvements.

## Environment variables

```
SNAPTRADE_OAUTH_CLIENT_ID=
SNAPTRADE_OAUTH_CLIENT_SECRET=
SNAPTRADE_REDIRECT_URI=          # must match the SnapTrade Dashboard exactly
APP_BASE_URL=
SESSION_SECRET=
TOKEN_ENCRYPTION_KEY=
DATABASE_URL=
```

## Known constraints

- **Redirect URIs must match exactly:** scheme, host, port, path, and trailing slash.
  - The local URI is `http://127.0.0.1:3000/oauth/snaptrade/callback`.
  - Browse the app at `127.0.0.1:3000`, not `localhost:3000`. Otherwise the session cookie won't match and the `state` check fails.
- **Test OAuth apps** are limited to five users.
- **Vercel Hobby** is limited to personal, non-commercial use.
