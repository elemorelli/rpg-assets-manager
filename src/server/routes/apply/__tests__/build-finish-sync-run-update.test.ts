import { describe, expect, it } from "vitest";

import type { BatchDiffResult } from "../../diff/index.ts";
import { buildFinishSyncRunUpdate } from "../build-finish-sync-run-update.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("buildFinishSyncRunUpdate", () => {
  it("counts each kind of change from the diff", () => {
    const diff: BatchDiffResult = {
      added: ["a.png", "b.png"],
      modified: ["c.png"],
      deleted: [],
      renamed: [{ oldPath: "old.png", newPath: "new.png" }],
      ambiguousWarnings: [],
    };
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate("applied", diff, [], null, {}, finishedAt);

    expect(update).toMatchObject({
      finished_at: finishedAt,
      added_count: 2,
      modified_count: 1,
      deleted_count: 0,
      renamed_count: 1,
      outcome: "applied",
    });
  });

  it("JSON-encodes purge urls and world acknowledgements", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate(
      "applied",
      emptyDiff,
      ["https://assets.example.com/a.png"],
      "// macro",
      { kingmaker: false },
      finishedAt,
    );

    expect(update.purged_urls).toBe(JSON.stringify(["https://assets.example.com/a.png"]));
    expect(update.world_acknowledgements).toBe(JSON.stringify({ kingmaker: false }));
    expect(update.generated_macro).toBe("// macro");
  });

  it("encodes empty purge urls and world acknowledgements for a dry run", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate("dry_run", emptyDiff, [], null, {}, finishedAt);

    expect(update.outcome).toBe("dry_run");
    expect(update.generated_macro).toBeNull();
    expect(update.purged_urls).toBe("[]");
    expect(update.world_acknowledgements).toBe("{}");
  });
});
