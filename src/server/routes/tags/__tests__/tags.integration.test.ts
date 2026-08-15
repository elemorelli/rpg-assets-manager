import { afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";

import { listDistinctTags } from "../list-distinct-tags.ts";

describe("listDistinctTags (requires DATABASE_URL pointing at a running Postgres)", () => {
  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", "distinct-tags-test/%").execute();
  });

  it("returns the distinct tags in use, alphabetically", async () => {
    await db
      .insertInto("assets")
      .values([
        {
          path: "distinct-tags-test/a.png",
          size: 1,
          mtime: new Date(),
          hash: "h1",
          tags: ["npc", "loot"],
        },
        { path: "distinct-tags-test/b.png", size: 1, mtime: new Date(), hash: "h2", tags: ["npc"] },
      ])
      .execute();

    expect(await listDistinctTags()).toEqual(["loot", "npc"]);
  });
});
