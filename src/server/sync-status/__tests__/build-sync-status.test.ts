import { describe, expect, it } from "vitest";

import type { BatchDiff } from "#utils/diff.ts";

import { buildSyncStatus } from "../build-sync-status.ts";

const EMPTY_DIFF: BatchDiff = {
  added: [],
  deleted: [],
  modified: [],
  renamed: [],
  ambiguousWarnings: [],
};

const LAST_SYNC_AT = new Date("2026-10-01T10:00:00.000Z");

describe("buildSyncStatus", () => {
  it("reports zero counts when nothing is pending", () => {
    expect(buildSyncStatus(EMPTY_DIFF, LAST_SYNC_AT)).toEqual({
      added: 0,
      modified: 0,
      deleted: 0,
      renamed: 0,
      lastSyncAt: "2026-10-01T10:00:00.000Z",
    });
  });

  it("counts only additions", () => {
    const diff: BatchDiff = { ...EMPTY_DIFF, added: ["maps/a.webp", "maps/b.webp"] };

    expect(buildSyncStatus(diff, LAST_SYNC_AT)).toMatchObject({ added: 2, deleted: 0 });
  });

  it("counts only deletions", () => {
    const diff: BatchDiff = { ...EMPTY_DIFF, deleted: ["maps/old.webp"] };

    expect(buildSyncStatus(diff, LAST_SYNC_AT)).toMatchObject({ added: 0, deleted: 1 });
  });

  it("counts every kind of change separately", () => {
    const diff: BatchDiff = {
      added: ["a.webp"],
      deleted: ["b.webp", "c.webp"],
      modified: ["d.webp"],
      renamed: [{ oldPath: "e.webp", newPath: "f.webp" }],
      ambiguousWarnings: [],
    };

    expect(buildSyncStatus(diff, LAST_SYNC_AT)).toEqual({
      added: 1,
      modified: 1,
      deleted: 2,
      renamed: 1,
      lastSyncAt: "2026-10-01T10:00:00.000Z",
    });
  });

  it("reports a null lastSyncAt when the tree was never synced", () => {
    expect(buildSyncStatus(EMPTY_DIFF, null).lastSyncAt).toBeNull();
  });
});
