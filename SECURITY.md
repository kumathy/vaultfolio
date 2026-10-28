# Security

Vaultfolio reads brokerage data on a user's behalf, so it is built to hold as little as possible and to protect what it does hold.

## In short

- **Read-only.** Vaultfolio asks SnapTrade only for `openid email read`. It has no trade access and calls no order endpoints.
- **No brokerage passwords.** Brokerages connect through SnapTrade; Vaultfolio never sees their credentials.
- **No brokerage data stored.** Reports are generated on request. The database holds only the account identity, encrypted SnapTrade tokens, settings, and hashed session and plugin tokens.
- **Secrets stay on the server.** The client secret and SnapTrade tokens never reach the browser or the Obsidian plugin.
- **Access can be removed at any time.** Disconnect revokes the SnapTrade grant, signs out every session and unlinks every vault.

## Sign-in

Sign-in uses SnapTrade's OAuth authorization code flow with PKCE.

- **PKCE (S256):** an intercepted authorization code cannot be exchanged without the matching verifier.
- **`state`:** checked at the callback, so a sign-in the browser did not start is rejected (login CSRF).
- **`nonce`:** required in the ID token, so a token from another sign-in cannot be replayed.
- **Flow cookie:** `state`, the verifier and `nonce` are kept in an encrypted, httpOnly cookie that lasts 10 minutes, is sent only to the callback, and is deleted after one use.
- **ID token:** verified with `jose` (RS256 signature from SnapTrade's published keys, plus issuer, audience, expiry and nonce). Users are identified by `sub`, and an email is used only when it is verified.
- **Issuer checks:** endpoints come from SnapTrade's discovery document with the issuer pinned, and the callback's `iss` is checked (RFC 9207), which prevents identity-provider mix-up.

## Sessions

- The session cookie holds a random token; only its SHA-256 hash is stored, so a database leak gives no usable sessions.
- A fresh session is issued at every sign-in (prevents session fixation).
- The cookie is `__Host-` prefixed, httpOnly, Secure and SameSite=Lax.
- Every page and route checks the session itself, not only middleware.
- Sign-out and disconnect check the request's `Origin` (prevents cross-site requests).
- Pages can't be framed (prevents clickjacking), OAuth codes are kept out of `Referer`, and financial pages are not cached.

## SnapTrade tokens

- **Encrypted at rest** with AES-256-GCM, a fresh IV each time, and the user and field bound to each value, so a ciphertext moved to another row fails to decrypt.
- **Refresh-token rotation** happens under a database row lock, so two simultaneous refreshes cannot spend the same token and end the grant.
- **On a 401**, the token is refreshed and the request retried once; if that fails, the tokens are deleted and the user signs in again.
- **Sent only to SnapTrade.** The API client refuses any host other than `api.snaptrade.com`.
- **Revoked when replaced or disconnected.** Local tokens are deleted even if SnapTrade's revocation request fails.
- **Never logged.** Logs record status codes and error types only, never response bodies, codes or tokens.

## Obsidian plugin

The plugin never holds SnapTrade tokens. It pairs with a short-lived, single-purpose token instead.

- **Pairing works like PKCE.** The plugin keeps a random verifier in memory and opens Vaultfolio with its hash. The one-time code that comes back (valid 5 minutes) is useless without the verifier, and a wrong verifier burns it.
- **Plugin tokens (`vfp_…`) can only download reports.** They are stored hashed, listed with their last use in Settings, revocable there or from the plugin, and revoked when SnapTrade is disconnected.
- **Treated as low-trust.** Plugin settings live in the vault, which may be synced or committed to git, so nothing more sensitive is kept there.

## Where to look

| Area                                  | Code                                                                                     |
| ------------------------------------- | ---------------------------------------------------------------------------------------- |
| OAuth client, ID token checks         | `src/lib/snaptrade/oauth.ts`, `src/lib/snaptrade/discovery.ts`                           |
| Callback, flow cookie                 | `src/lib/auth/callback.ts`, `src/lib/auth/flow-cookie.ts`                                |
| Sessions, request checks              | `src/lib/auth/session.ts`, `src/lib/auth/http.ts`, `next.config.ts`                      |
| Token encryption, refresh, revocation | `src/lib/crypto/aes-gcm.ts`, `src/lib/snaptrade/tokens.ts`, `src/lib/snaptrade/grant.ts` |
| Plugin pairing                        | `src/lib/auth/plugin.ts`, `obsidian-plugin/src/pkce.ts`                                  |

## Reporting a vulnerability

Please report security issues privately to the maintainer rather than in a public issue.
