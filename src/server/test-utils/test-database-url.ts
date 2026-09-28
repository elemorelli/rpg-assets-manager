const TEST_DATABASE_SUFFIX = "_test";

// Tests run against a sibling database so they can never touch the dev data behind DATABASE_URL.
export const toTestDatabaseUrl = (databaseUrl: string): string => {
  const url = new URL(databaseUrl);
  const databaseName = url.pathname.replace(/^\//, "");

  if (databaseName === "") {
    // The url is left out of the message on purpose, it may carry a password.
    throw new Error("DATABASE_URL has no database name");
  }

  if (databaseName.endsWith(TEST_DATABASE_SUFFIX)) {
    return databaseUrl;
  }

  url.pathname = `/${databaseName}${TEST_DATABASE_SUFFIX}`;

  return url.toString();
};
