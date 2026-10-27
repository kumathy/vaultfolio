import { defineConfig } from "drizzle-kit";

// drizzle-kit does not read .env.local. Deployed environments supply DATABASE_URL directly.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
