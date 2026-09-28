import { describe, expect, it } from "vitest";

import { toTestDatabaseUrl } from "../test-database-url.ts";

describe("toTestDatabaseUrl", () => {
  it("points at a database named after the original one with a test suffix", () => {
    const testUrl = toTestDatabaseUrl("postgres://user:secret@127.0.0.1:5433/rpgassets");

    expect(testUrl).toBe("postgres://user:secret@127.0.0.1:5433/rpgassets_test");
  });

  it("keeps connection options from the query string", () => {
    const testUrl = toTestDatabaseUrl("postgres://user@db.local/rpgassets?sslmode=require");

    expect(testUrl).toBe("postgres://user@db.local/rpgassets_test?sslmode=require");
  });

  it("leaves a url that already targets a test database unchanged", () => {
    const alreadyTestUrl = "postgres://user@db.local/rpgassets_test";

    expect(toTestDatabaseUrl(alreadyTestUrl)).toBe(alreadyTestUrl);
  });

  it("rejects a url without a database name", () => {
    expect(() => toTestDatabaseUrl("postgres://user@db.local")).toThrow(/database name/);
  });
});
