import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "./db-types.ts";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const dialect = new PostgresDialect({
  pool: new pg.Pool({ connectionString }),
});

export const db = new Kysely<DB>({ dialect });
