import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  // `sub` claim of the verified SnapTrade ID token.
  snaptradeSub: text("snaptrade_sub").notNull().unique(),
  email: text("email"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie value. A database leak exposes no usable session.
    idHash: text("id_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);

// Token columns hold AES-256-GCM ciphertext (see src/lib/crypto/aes-gcm.ts).
export const snaptradeTokens = pgTable("snaptrade_tokens", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  accessExpiresAt: timestamp("access_expires_at", {
    withTimezone: true,
  }).notNull(),
  scope: text("scope").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// User-entered settings only, validated on read and write
// (src/lib/settings/parse.ts). No brokerage data is stored here.
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  settings: jsonb("settings").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One-time codes that hand a sign-in from the browser to the Obsidian plugin.
// Only hashes are stored, and a code is deleted when exchanged or expired.
export const pairingCodes = pgTable(
  "pairing_codes",
  {
    // SHA-256 of the code sent through the obsidian:// link.
    codeHash: text("code_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // S256 challenge from the plugin: an intercepted code is useless without
    // the verifier that never leaves the plugin.
    challenge: text("challenge").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("pairing_codes_user_id_idx").on(table.userId)],
);

// Plugin tokens can only read rendered reports. They live in the vault's
// data.json, which may be synced or committed, so they are low-trust: hashed
// here, revocable from Settings, and never able to reach SnapTrade directly.
export const pluginTokens = pgTable(
  "plugin_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // SHA-256 of the token. A database leak exposes no usable token.
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [index("plugin_tokens_user_id_idx").on(table.userId)],
);
