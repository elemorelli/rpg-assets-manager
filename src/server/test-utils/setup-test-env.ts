import { TEST_PASSWORD_HASH } from "#server/test-utils/login-test-session.ts";

// Several config modules (#server/auth/config.ts, #server/routes/apply/config.ts,
// #server/db/client.ts) read process.env at import time. Force known test values
// here, before any test file imports server modules, so the suite never depends
// on a developer's real .env values.
process.env.AUTH_PASSWORD_HASH = TEST_PASSWORD_HASH;
process.env.AUTH_SESSION_SECRET = "test-session-secret";
process.env.DRY_RUN = "true";

// db/client.ts throws at import time if this is unset, even for tests that never
// run a query (e.g. building the app to test routing/auth). Integration tests that
// actually need Postgres set their own real DATABASE_URL before importing db/index.ts.
process.env.DATABASE_URL ??= "postgres://unit-tests-do-not-use-a-real-database/placeholder";
