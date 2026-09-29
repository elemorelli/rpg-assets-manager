import { TEST_PASSWORD_HASH } from "#server/test-utils/login-test-session.ts";
import { toTestDatabaseUrl } from "#server/test-utils/test-database-url.ts";

// Config modules read process.env at import time, so known values are forced before any server module loads.
process.env.AUTH_PASSWORD_HASH = TEST_PASSWORD_HASH;
process.env.AUTH_SESSION_SECRET = "test-session-secret";
process.env.DRY_RUN = "true";

// A real DATABASE_URL points at its recreated test sibling; without one, db/client.ts still needs a placeholder.
const UNIT_TEST_DATABASE_URL = "postgres://unit-tests-do-not-use-a-real-database/placeholder";
const configuredDatabaseUrl = process.env.DATABASE_URL;

process.env.DATABASE_URL = configuredDatabaseUrl
  ? toTestDatabaseUrl(configuredDatabaseUrl)
  : UNIT_TEST_DATABASE_URL;
