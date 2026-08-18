import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCurrentJob, subscribeToJobChanges } from "#server/routes/jobs/index.ts";
import { useTempDir } from "#server/test-utils/integration-lifecycle.ts";

// destinationRoot has to exist and be assigned to RCLONE_REMOTE before
// reconcile/index.ts (and the rclone config module it pulls in) is imported,
// since that module reads process.env.RCLONE_REMOTE once at import time. That
// rules out useTempDir here, which only creates its directory in beforeEach.
const destinationRoot = await fs.mkdtemp(path.join(os.tmpdir(), "reconcile-dest-"));
process.env.RCLONE_REMOTE = destinationRoot;

const { reconcileHandler } = await import("../index.ts");

const PREFIX = "reconcile-test/";

afterAll(async () => {
  await fs.rm(destinationRoot, { recursive: true, force: true });
});

describe("reconcileHandler (requires the real rclone binary)", () => {
  const sourceRoot = useTempDir("reconcile-source-");

  beforeEach(async () => {
    await fs.mkdir(path.join(sourceRoot.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.mkdir(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), {
      recursive: true,
      force: true,
    });
  });

  it("tracks a reconcile job and returns the real rclone check result", async () => {
    await fs.writeFile(path.join(sourceRoot.path, `${PREFIX}matching.png`), "same-bytes");
    await fs.writeFile(path.join(destinationRoot, `${PREFIX}matching.png`), "same-bytes");
    await fs.writeFile(
      path.join(sourceRoot.path, `${PREFIX}only-on-source.png`),
      "source-only-bytes",
    );

    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const result = await reconcileHandler(sourceRoot.path)();

    unsubscribe();

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual([`${PREFIX}only-on-source.png`]);
    expect(observedJobs[0]).toMatchObject({ type: "reconcile", stage: "checking", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("fails the job and rejects when rclone check cannot run", async () => {
    const missingSourceRoot = path.join(sourceRoot.path, "does-not-exist");

    await expect(reconcileHandler(missingSourceRoot)()).rejects.toThrow();

    expect(getCurrentJob()).toMatchObject({ type: "reconcile" });
    expect(getCurrentJob()?.error).not.toBeNull();
  });
});
