import { afterAll, describe, expect, it } from "vitest";
import { db } from "../index.ts";

describe("db (requires DATABASE_URL pointing at a running Postgres)", () => {
  afterAll(async () => {
    await db.destroy();
  });

  it("round-trips a row in assets", async () => {
    const inserted = await db
      .insertInto("assets")
      .values({
        path: "tiles/smoke-test.png",
        size: 1,
        mtime: new Date(),
        hash: "smoke-test-hash",
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    const found = await db
      .selectFrom("assets")
      .select(["path", "hash"])
      .where("id", "=", inserted.id)
      .executeTakeFirstOrThrow();

    expect(found).toEqual({ path: "tiles/smoke-test.png", hash: "smoke-test-hash" });

    await db.deleteFrom("assets").where("id", "=", inserted.id).execute();
  });
});
