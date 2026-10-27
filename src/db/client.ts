import "server-only";

import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import { env } from "@/lib/env";
import * as schema from "./schema";

function createHttpDb() {
  return drizzleHttp({ client: neon(env.databaseUrl), schema });
}

let httpDb: ReturnType<typeof createHttpDb> | undefined;

// One-shot queries over HTTP: no connection to hold open between serverless invocations.
export function db() {
  httpDb ??= createHttpDb();
  return httpDb;
}

type PoolDb = ReturnType<typeof drizzlePool<typeof schema>>;
export type Transaction = Parameters<Parameters<PoolDb["transaction"]>[0]>[0];

// The HTTP driver cannot hold a row lock across statements, so interactive
// transactions use a WebSocket pool scoped to the single call.
export async function withTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  const pool = new Pool({ connectionString: env.databaseUrl });
  try {
    return await drizzlePool({ client: pool, schema }).transaction(fn);
  } finally {
    await pool.end();
  }
}
