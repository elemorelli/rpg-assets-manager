import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import { readSubtreeContribution } from "../read-subtree-contribution.ts";

describe("readSubtreeContribution", () => {
  it("reads a file's size from the assets table", async () => {
    const db = createFakeDb();

    await db
      .insertInto("assets")
      .values({ path: "tiles/a.png", size: 14, mtime: new Date(), hash: "hash-a" })
      .execute();

    const contribution = await readSubtreeContribution(db, "tiles/a.png", false);

    expect(contribution).toEqual({ size: 14, fileCount: 1, folderCount: 0 });
  });

  it("returns zero contribution for an untracked file", async () => {
    const db = createFakeDb();

    const contribution = await readSubtreeContribution(db, "tiles/a.png", false);

    expect(contribution).toEqual({ size: 0, fileCount: 0, folderCount: 0 });
  });

  it("reads a directory's recursive totals from the directories table, counting itself as one folder", async () => {
    const db = createFakeDb();

    await db
      .insertInto("directories")
      .values({
        path: "tiles",
        parent_id: null,
        total_size: 30,
        file_count: 2,
        folder_count: 1,
      })
      .execute();

    const contribution = await readSubtreeContribution(db, "tiles", true);

    expect(contribution).toEqual({ size: 30, fileCount: 2, folderCount: 2 });
  });

  it("returns zero contribution for a directory with no row (never tracked, so its parent's folder_count never counted it either)", async () => {
    const db = createFakeDb();

    const contribution = await readSubtreeContribution(db, "tiles", true);

    expect(contribution).toEqual({ size: 0, fileCount: 0, folderCount: 0 });
  });
});
