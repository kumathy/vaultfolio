import "server-only";

import { parseKey } from "@/lib/crypto/aes-gcm";

// Read on first use rather than at import, so `next build` runs without secrets.
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get snaptradeClientId() {
    return required("SNAPTRADE_OAUTH_CLIENT_ID");
  },
  get snaptradeClientSecret() {
    return required("SNAPTRADE_OAUTH_CLIENT_SECRET");
  },
  get redirectUri() {
    return required("SNAPTRADE_REDIRECT_URI");
  },
  get appBaseUrl() {
    return new URL(required("APP_BASE_URL")).origin;
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get sessionKey() {
    return parseKey(required("SESSION_SECRET"));
  },
  get tokenEncryptionKey() {
    return parseKey(required("TOKEN_ENCRYPTION_KEY"));
  },
  // Derived from the deployed URL rather than NODE_ENV, so `next start` over
  // plain http on 127.0.0.1 still receives its cookies.
  get secureCookies() {
    return this.appBaseUrl.startsWith("https://");
  },
};
