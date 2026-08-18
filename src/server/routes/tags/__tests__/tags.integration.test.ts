import { afterEach, describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";

import { listDistinctTags } from "../list-distinct-tags.ts";

describe("listDistinctTags (requires DATABASE_URL pointing at a running Postgres)", () => {
  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", "distinct-tags-test/%").execute();
  });

  it("returns the distinct tags in use, alphabetically", async () => {
    // listDistinctTags() reads across the whole table by design, so scope the
    // assertion to the tags this test introduces rather than the full result:
    // any tag already in the table (another suite's leftover row, real dev
    // data) must not make this test flaky.
    const tagsBeforeInsert = await listDistinctTags();

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

    const tagsAfterInsert = await listDistinctTags();
    const introducedTags = tagsAfterInsert.filter((tag) => !tagsBeforeInsert.includes(tag));

    expect(introducedTags).toEqual(["loot", "npc"]);
  });
});
