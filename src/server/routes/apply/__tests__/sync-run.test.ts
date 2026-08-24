import type { Kysely } from "kysely";
import { describe, expect, it, vi } from "vitest";

import type { DB } from "#server/db/index.ts";
import { createMockDb, type MockDb } from "#server/test-utils/mock-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

let currentMockDb: Kysely<DB>;

vi.mock("#server/db/index.ts", () => ({
  get db() {
    return currentMockDb;
  },
}));

const { buildFinishSyncRunUpdate, failSyncRun, finishSyncRun, startSyncRun } = await import(
  "../sync-run.ts"
);

const createMock = (): MockDb => {
  const mockDb = createMockDb();

  currentMockDb = mockDb;

  return mockDb as unknown as MockDb;
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

    const update = buildFinishSyncRunUpdate("applied", diff, [], finishedAt);

    expect(update).toMatchObject({
      finished_at: finishedAt,
      added_count: 2,
      modified_count: 1,
      deleted_count: 0,
      renamed_count: 1,
      outcome: "applied",
    });
  });

  it("JSON-encodes purge urls", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate(
      "applied",
      emptyDiff,
      ["https://assets.example.com/a.png"],
      finishedAt,
    );

    expect(update.purged_urls).toBe(JSON.stringify(["https://assets.example.com/a.png"]));
  });

  it("encodes empty purge urls for a dry run", () => {
    const finishedAt = new Date("2026-08-15T10:00:00Z");

    const update = buildFinishSyncRunUpdate("dry_run", emptyDiff, [], finishedAt);

    expect(update.outcome).toBe("dry_run");
    expect(update.purged_urls).toBe("[]");
  });
});

// The update payload's content (counts, JSON encoding) is covered above by
// buildFinishSyncRunUpdate's own tests. These only exercise the wiring: does
// each function write to the right row via the right Kysely call.

describe("startSyncRun", () => {
  it("inserts a new sync_runs row and returns its numeric id", async () => {
    const mock = createMock();

    mock.insertInto("sync_runs").executeTakeFirstOrThrow.mockResolvedValueOnce({ id: "1" });

    const syncRunId = await startSyncRun();

    expect(syncRunId).toBe(1);
    expect(mock.insertInto("sync_runs").values).toHaveBeenCalledWith({ finished_at: null });
  });
});

describe("finishSyncRun", () => {
  it("updates the sync_runs row for the given id", async () => {
    const mock = createMock();

    await finishSyncRun(1, "applied", emptyDiff, []);

    expect(mock.updateTable("sync_runs").set).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "applied" }),
    );
    expect(mock.updateTable("sync_runs").where).toHaveBeenCalledWith("id", "=", "1");
  });
});

describe("failSyncRun", () => {
  it("marks the run as failed and stamps finished_at", async () => {
    const mock = createMock();

    await failSyncRun(1);

    expect(mock.updateTable("sync_runs").set).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed" }),
    );
    const [setArgs] = mock.updateTable("sync_runs").set.mock.calls[0];
    expect(setArgs.finished_at).toBeInstanceOf(Date);
  });
});
