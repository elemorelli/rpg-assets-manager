import { describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
} from "#server/test-utils/integration-lifecycle.ts";

import { computeBatchDiff } from "../compute-batch.ts";

const PREFIX = "diff-test/";

describe("computeBatchDiff (requires DATABASE_URL pointing at a running Postgres)", () => {
  cleanupAssetsByPrefix(PREFIX, ["assets", "remote_assets"]);
  destroyDbAfterAll();

  it("classifies unchanged, modified, added, deleted, and renamed paths", async () => {
    const now = new Date();

    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}unchanged.png`, size: 1, mtime: now, hash: "hash-unchanged" },
        { path: `${PREFIX}modified.png`, size: 1, mtime: now, hash: "hash-modified-new" },
        { path: `${PREFIX}added.png`, size: 1, mtime: now, hash: "hash-added" },
        { path: `${PREFIX}renamed-new.png`, size: 1, mtime: now, hash: "hash-renamed" },
      ])
      .execute();

    await db
      .insertInto("remote_assets")
      .values([
        { path: `${PREFIX}unchanged.png`, size: 1, hash: "hash-unchanged" },
        { path: `${PREFIX}modified.png`, size: 1, hash: "hash-modified-old" },
        { path: `${PREFIX}deleted.png`, size: 1, hash: "hash-deleted" },
        { path: `${PREFIX}renamed-old.png`, size: 1, hash: "hash-renamed" },
      ])
      .execute();

    const diff = await computeBatchDiff(db);
    const inScope = (paths: string[]): string[] =>
      paths.filter((entry) => entry.startsWith(PREFIX));

    expect(inScope(diff.added)).toEqual([`${PREFIX}added.png`]);
    expect(inScope(diff.deleted)).toEqual([`${PREFIX}deleted.png`]);
    expect(inScope(diff.modified)).toEqual([`${PREFIX}modified.png`]);
    expect(diff.renamed.filter((pair) => pair.newPath.startsWith(PREFIX))).toEqual([
      { oldPath: `${PREFIX}renamed-old.png`, newPath: `${PREFIX}renamed-new.png` },
    ]);
  });

  it("flags an ambiguous rename group with a warning instead of guessing", async () => {
    const now = new Date();

    await db
      .insertInto("assets")
      .values([
        { path: `${PREFIX}ambi-a.png`, size: 1, mtime: now, hash: "hash-ambi" },
        { path: `${PREFIX}ambi-b.png`, size: 1, mtime: now, hash: "hash-ambi" },
      ])
      .execute();

    await db
      .insertInto("remote_assets")
      .values([
        { path: `${PREFIX}ambi-c.png`, size: 1, hash: "hash-ambi" },
        { path: `${PREFIX}ambi-d.png`, size: 1, hash: "hash-ambi" },
      ])
      .execute();

    const diff = await computeBatchDiff(db);
    const warning = diff.ambiguousWarnings.find((entry) => entry.hash === "hash-ambi");

    expect(warning).toEqual({
      hash: "hash-ambi",
      localPaths: [`${PREFIX}ambi-a.png`, `${PREFIX}ambi-b.png`],
      remotePaths: [`${PREFIX}ambi-c.png`, `${PREFIX}ambi-d.png`],
    });
    expect(diff.renamed.some((pair) => pair.newPath.startsWith(PREFIX))).toBe(false);
  });
});
