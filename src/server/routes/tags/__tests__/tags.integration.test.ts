import { describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
} from "#server/test-utils/integration-lifecycle.ts";

import { listDistinctTags } from "../list.ts";

describe("listDistinctTags (requires DATABASE_URL pointing at a running Postgres)", () => {
  cleanupAssetsByPrefix("distinct-tags-test/");
  destroyDbAfterAll();

  it("returns the distinct tags in use, alphabetically", async () => {
    // listDistinctTags() reads the whole table, so assert only on this test's tags to stay immune to leftover rows.
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
