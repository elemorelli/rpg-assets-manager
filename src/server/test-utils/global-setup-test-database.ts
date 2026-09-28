import { runner } from "node-pg-migrate";
import pg from "pg";

import { toTestDatabaseUrl } from "./test-database-url.ts";

const MAINTENANCE_DATABASE_PATH = "/postgres";
const MIGRATIONS_DIR = "migrations";
const MIGRATIONS_TABLE = "pgmigrations";
const CONNECTION_REFUSED_CODE = "ECONNREFUSED";

const toMaintenanceUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);
  url.pathname = MAINTENANCE_DATABASE_PATH;

  return url.toString();
};

const isConnectionRefused = (error: unknown): boolean => {
  const code = (error as { code?: unknown }).code;

  return code === CONNECTION_REFUSED_CODE;
};

const recreateDatabase = async (maintenanceUrl: string, databaseName: string): Promise<void> => {
  const client = new pg.Client({ connectionString: maintenanceUrl });
  await client.connect();

  try {
    const quotedName = pg.escapeIdentifier(databaseName);

    await client.query(`DROP DATABASE IF EXISTS ${quotedName} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${quotedName}`);
  } finally {
    await client.end();
  }
};

// Vitest global setup: every run starts from an empty, fully migrated test database.
const setupTestDatabase = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;

  // Unit-only runs from a plain shell have no DATABASE_URL and need no database.
  if (!databaseUrl) {
    return;
  }

  const testDatabaseUrl = toTestDatabaseUrl(databaseUrl);
  const testDatabaseName = new URL(testDatabaseUrl).pathname.slice(1);

  try {
    await recreateDatabase(toMaintenanceUrl(databaseUrl), testDatabaseName);
  } catch (error) {
    if (!isConnectionRefused(error)) {
      throw error;
    }

    // Unit tests still run with Postgres down; integration tests will fail on their own connection.
    console.warn(`Postgres is not reachable, skipping creation of ${testDatabaseName}`);

    return;
  }

  await runner({
    databaseUrl: testDatabaseUrl,
    dir: MIGRATIONS_DIR,
    direction: "up",
    migrationsTable: MIGRATIONS_TABLE,
    count: Number.POSITIVE_INFINITY,
    log: () => {},
  });
};

export default setupTestDatabase;
