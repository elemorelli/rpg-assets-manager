import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCurrentJob, subscribeToJobChanges } from "#server/routes/jobs/index.ts";

const destinationRoot = await fs.mkdtemp(path.join(os.tmpdir(), "reconcile-dest-"));
process.env.RCLONE_REMOTE = destinationRoot;

const { reconcileHandler } = await import("../index.ts");

const PREFIX = "reconcile-test/";

let sourceRoot = "";

beforeEach(async () => {
  sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "reconcile-source-"));
  await fs.mkdir(path.join(sourceRoot, PREFIX.replace(/\/$/, "")), { recursive: true });
  await fs.mkdir(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), { recursive: true });
});

afterEach(async () => {
  await fs.rm(sourceRoot, { recursive: true, force: true });
  await fs.rm(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), {
    recursive: true,
    force: true,
  });
});

afterAll(async () => {
  await fs.rm(destinationRoot, { recursive: true, force: true });
});

describe("reconcileHandler (requires the real rclone binary)", () => {
  it("tracks a reconcile job and returns the real rclone check result", async () => {
    await fs.writeFile(path.join(sourceRoot, `${PREFIX}matching.png`), "same-bytes");
    await fs.writeFile(path.join(destinationRoot, `${PREFIX}matching.png`), "same-bytes");
    await fs.writeFile(path.join(sourceRoot, `${PREFIX}only-on-source.png`), "source-only-bytes");

    const observedJobs: unknown[] = [];
    const unsubscribe = subscribeToJobChanges((job) => observedJobs.push(job));

    const result = await reconcileHandler(sourceRoot)();

    unsubscribe();

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual([`${PREFIX}only-on-source.png`]);
    expect(observedJobs[0]).toMatchObject({ type: "reconcile", stage: "checking", done: 0 });
    expect(getCurrentJob()).toBeNull();
  });

  it("fails the job and rejects when rclone check cannot run", async () => {
    const missingSourceRoot = path.join(sourceRoot, "does-not-exist");

    await expect(reconcileHandler(missingSourceRoot)()).rejects.toThrow();

    expect(getCurrentJob()).toMatchObject({ type: "reconcile" });
    expect(getCurrentJob()?.error).not.toBeNull();
  });
});
