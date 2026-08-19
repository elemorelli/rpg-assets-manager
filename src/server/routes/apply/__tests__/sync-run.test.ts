import { describe, expect, it } from "vitest";

import { createFakeDb } from "#server/test-utils/fake-db.ts";

import type { BatchDiffResult } from "../../diff/index.ts";
import { failSyncRun, finishSyncRun, startSyncRun } from "../sync-run.ts";

// The update payload's content (counts, JSON encoding) is covered, without any DB
// involved, by build-finish-sync-run-update.test.ts. These tests only exercise the
// wiring: does each function write to the right row via the right Kysely call.

const emptyDiff: BatchDiffResult = {
  added: [],
  modified: [],
  deleted: [],
  renamed: [],
  ambiguousWarnings: [],
};

describe("startSyncRun", () => {
  it("inserts a new sync_runs row and returns its numeric id", async () => {
    const db = createFakeDb();

    const syncRunId = await startSyncRun(db);

    expect(syncRunId).toBe(1);
    expect(db.rows("sync_runs")).toMatchObject([{ id: "1", finished_at: null }]);
  });
});

describe("finishSyncRun", () => {
  it("updates the sync_runs row for the given id", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    await finishSyncRun(db, syncRunId, "applied", emptyDiff, []);

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({ id: String(syncRunId), outcome: "applied" });
    expect(row?.finished_at).toBeInstanceOf(Date);
  });
});

describe("failSyncRun", () => {
  it("marks the run as failed and stamps finished_at", async () => {
    const db = createFakeDb();
    const syncRunId = await startSyncRun(db);

    await failSyncRun(db, syncRunId);

    const [row] = db.rows("sync_runs");

    expect(row).toMatchObject({ outcome: "failed" });
    expect(row?.finished_at).toBeInstanceOf(Date);
  });
});
