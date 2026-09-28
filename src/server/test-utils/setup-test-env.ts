import { TEST_PASSWORD_HASH } from "#server/test-utils/login-test-session.ts";
import { toTestDatabaseUrl } from "#server/test-utils/test-database-url.ts";

// Several config modules (#server/auth/config.ts, #server/routes/apply/config.ts,
// #server/db/client.ts) read process.env at import time. Force known test values
// here, before any test file imports server modules, so the suite never depends
// on a developer's real .env values.
process.env.AUTH_PASSWORD_HASH = TEST_PASSWORD_HASH;
process.env.AUTH_SESSION_SECRET = "test-session-secret";
process.env.DRY_RUN = "true";

// A real DATABASE_URL is swapped for its sibling test database, which the global
// setup recreates on every run, so tests never touch the dev data. Without one,
// db/client.ts still needs a value at import time, so a placeholder is used.
const UNIT_TEST_DATABASE_URL = "postgres://unit-tests-do-not-use-a-real-database/placeholder";
const configuredDatabaseUrl = process.env.DATABASE_URL;

process.env.DATABASE_URL = configuredDatabaseUrl
  ? toTestDatabaseUrl(configuredDatabaseUrl)
  : UNIT_TEST_DATABASE_URL;
