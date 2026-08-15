import { afterEach, describe, expect, it } from "vitest";
import { db } from "#server/db/index.ts";
import { findFilesByTags } from "../find-files-by-tag.ts";

describe("findFilesByTags (requires DATABASE_URL pointing at a running Postgres)", () => {
  afterEach(async () => {
    await db.deleteFrom("assets").where("path", "like", "by-tag-test/%").execute();
  });

  it("returns only files carrying every requested tag", async () => {
    await db
      .insertInto("assets")
      .values([
        {
          path: "by-tag-test/a.png",
          size: 1,
          mtime: new Date(),
          hash: "h1",
          tags: ["npc", "loot"],
        },
        { path: "by-tag-test/b.png", size: 1, mtime: new Date(), hash: "h2", tags: ["npc"] },
        { path: "by-tag-test/c.png", size: 1, mtime: new Date(), hash: "h3", tags: ["loot"] },
      ])
      .execute();

    const results = await findFilesByTags(["npc", "loot"]);

    expect(results).toEqual([{ relativePath: "by-tag-test/a.png", type: "file" }]);
  });

  it("returns an empty array when no tags are requested", async () => {
    expect(await findFilesByTags([])).toEqual([]);
  });
});
