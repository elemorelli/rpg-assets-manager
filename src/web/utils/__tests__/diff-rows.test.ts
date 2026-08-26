import { describe, expect, it } from "vitest";

import {
  buildConversionDiffRows,
  buildReconcileDiffRows,
  buildSyncDiffRows,
} from "#web/utils/diff-rows.ts";

describe("buildSyncDiffRows", () => {
  it("maps added files to an after-only row", () => {
    const rows = buildSyncDiffRows({
      added: ["a.png"],
      modified: [],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    expect(rows).toEqual([
      { key: "added:a.png", kind: "added", before: undefined, after: "a.png" },
    ]);
  });

  it("maps modified files to a row with the same path on both sides", () => {
    const rows = buildSyncDiffRows({
      added: [],
      modified: ["b.png"],
      deleted: [],
      renamed: [],
      ambiguousWarnings: [],
    });

    expect(rows).toEqual([
      { key: "modified:b.png", kind: "modified", before: "b.png", after: "b.png" },
    ]);
  });

  it("maps deleted files to a before-only row", () => {
    const rows = buildSyncDiffRows({
      added: [],
      modified: [],
      deleted: ["c.png"],
      renamed: [],
      ambiguousWarnings: [],
    });

    expect(rows).toEqual([
      { key: "deleted:c.png", kind: "removed", before: "c.png", after: undefined },
    ]);
  });

  it("maps renamed pairs to a row with the old path before and the new path after", () => {
    const rows = buildSyncDiffRows({
      added: [],
      modified: [],
      deleted: [],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [],
    });

    expect(rows).toEqual([
      { key: "renamed:old.png", kind: "renamed", before: "old.png", after: "new.png" },
    ]);
  });

  it("orders rows as added, modified, deleted, then renamed", () => {
    const rows = buildSyncDiffRows({
      added: ["a.png"],
      modified: ["b.png"],
      deleted: ["c.png"],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [],
    });

    expect(rows.map((row) => row.kind)).toEqual(["added", "modified", "removed", "renamed"]);
  });
});

describe("buildConversionDiffRows", () => {
  it("maps a candidate to a renamed row from its relative path to its destination path", () => {
    const rows = buildConversionDiffRows([
      { relativePath: "a.png", kind: "image", destinationPath: "a.webp", willOverwrite: false },
    ]);

    expect(rows).toEqual([
      {
        key: "a.png",
        kind: "renamed",
        before: "a.png",
        after: "a.webp",
        overwrite: false,
      },
    ]);
  });

  it("flags a candidate that will overwrite an existing destination file", () => {
    const rows = buildConversionDiffRows([
      { relativePath: "a.png", kind: "image", destinationPath: "a.webp", willOverwrite: true },
    ]);

    expect(rows[0]).toMatchObject({ overwrite: true });
  });
});

describe("buildReconcileDiffRows", () => {
  it("maps files missing on the destination to a before-only row", () => {
    const rows = buildReconcileDiffRows({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: ["a.png"],
      differs: [],
      errors: [],
    });

    expect(rows).toEqual([
      { key: "missing-destination:a.png", kind: "removed", before: "a.png", after: undefined },
    ]);
  });

  it("maps files missing on the source to an after-only row", () => {
    const rows = buildReconcileDiffRows({
      matchCount: 0,
      missingOnSource: ["b.png"],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });

    expect(rows).toEqual([
      { key: "missing-source:b.png", kind: "added", before: undefined, after: "b.png" },
    ]);
  });

  it("maps differing files to a row with the same path on both sides", () => {
    const rows = buildReconcileDiffRows({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: ["c.png"],
      errors: [],
    });

    expect(rows).toEqual([
      { key: "differs:c.png", kind: "modified", before: "c.png", after: "c.png" },
    ]);
  });

  it("does not include errored paths, since those render as a separate list", () => {
    const rows = buildReconcileDiffRows({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: ["d.png"],
    });

    expect(rows).toEqual([]);
  });
});
