import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { db } from "#server/db/index.ts";

import { applyBatch } from "../batch.ts";

const PREFIX = "apply-batch-test/";

afterEach(async () => {
  await db.deleteFrom("assets").where("path", "like", `${PREFIX}%`).execute();
  await db.deleteFrom("remote_assets").where("path", "like", `${PREFIX}%`).execute();
});

afterAll(async () => {
  await db.destroy();
});

describe("applyBatch (requires DATABASE_URL and the real rclone binary)", () => {
  it("in dry run mode, reports the plan without touching remote_assets, rclone, or purge", async () => {
    const now = new Date();

    await db
      .insertInto("assets")
      .values([{ path: `${PREFIX}added.png`, size: 1, mtime: now, hash: "hash-added" }])
      .execute();

    const purge = vi.fn();
    const summary = await applyBatch(db, {
      rootDir: "/unused",
      destinationRoot: "/unused",
      baseUrl: "https://assets.example.com",
      dryRun: true,
      purge,
      foundryWorldNames: [],
    });

    expect(summary.outcome).toBe("dry_run");
    expect(summary.added).toBeGreaterThanOrEqual(1);
    expect(purge).not.toHaveBeenCalled();

    const remoteRow = await db
      .selectFrom("remote_assets")
      .selectAll()
      .where("path", "=", `${PREFIX}added.png`)
      .executeTakeFirst();
    expect(remoteRow).toBeUndefined();

    const syncRun = await db
      .selectFrom("sync_runs")
      .selectAll()
      .where("id", "=", String(summary.syncRunId))
      .executeTakeFirstOrThrow();
    expect(syncRun.outcome).toBe("dry_run");
  });

  it("applies for real: runs rclone against a local destination, updates remote_assets, and purges", async () => {
    const now = new Date();
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "apply-batch-root-"));
    const destinationRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apply-batch-dest-"));

    await fs.mkdir(path.join(rootDir, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(rootDir, `${PREFIX}added.png`), "added-bytes");
    await fs.writeFile(path.join(destinationRoot, "placeholder"), "");
    await fs.mkdir(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(destinationRoot, `${PREFIX}stale.png`), "stale-bytes");

    await db
      .insertInto("assets")
      .values([{ path: `${PREFIX}added.png`, size: 11, mtime: now, hash: "hash-added" }])
      .execute();
    await db
      .insertInto("remote_assets")
      .values([{ path: `${PREFIX}stale.png`, size: 11, hash: "hash-stale" }])
      .execute();

    const purge = vi.fn().mockResolvedValue(undefined);
    const onProgress = vi.fn();

    const summary = await applyBatch(
      db,
      {
        rootDir,
        destinationRoot,
        baseUrl: "https://assets.example.com",
        dryRun: false,
        purge,
        foundryWorldNames: [],
      },
      onProgress,
    );

    expect(summary.outcome).toBe("applied");
    expect(await fs.readFile(path.join(destinationRoot, `${PREFIX}added.png`), "utf8")).toBe(
      "added-bytes",
    );
    await expect(fs.access(path.join(destinationRoot, `${PREFIX}stale.png`))).rejects.toThrow();

    const addedRow = await db
      .selectFrom("remote_assets")
      .selectAll()
      .where("path", "=", `${PREFIX}added.png`)
      .executeTakeFirstOrThrow();
    expect(addedRow.hash).toBe("hash-added");

    const staleRow = await db
      .selectFrom("remote_assets")
      .selectAll()
      .where("path", "=", `${PREFIX}stale.png`)
      .executeTakeFirst();
    expect(staleRow).toBeUndefined();

    expect(purge).toHaveBeenCalledWith(
      expect.arrayContaining([
        "https://assets.example.com/apply-batch-test/added.png",
        "https://assets.example.com/apply-batch-test/stale.png",
      ]),
    );
    expect(onProgress).toHaveBeenCalledWith({ done: 2, total: 2 });

    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(destinationRoot, { recursive: true, force: true });
  });

  it("on a real apply with renames, stores a macro and initial world acknowledgements", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "apply-batch-root-"));
    const destinationRoot = await fs.mkdtemp(path.join(os.tmpdir(), "apply-batch-dest-"));

    await fs.mkdir(path.join(destinationRoot, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(destinationRoot, `${PREFIX}old.png`), "renamed-bytes");

    await db
      .insertInto("assets")
      .values([{ path: `${PREFIX}new.png`, size: 13, mtime: new Date(), hash: "hash-rename" }])
      .execute();
    await db
      .insertInto("remote_assets")
      .values([{ path: `${PREFIX}old.png`, size: 13, hash: "hash-rename" }])
      .execute();

    const summary = await applyBatch(db, {
      rootDir,
      destinationRoot,
      baseUrl: "https://assets.example.com",
      dryRun: false,
      purge: vi.fn().mockResolvedValue(undefined),
      foundryWorldNames: ["kingmaker", "stolen-fate"],
    });

    expect(summary.renamed).toBe(1);

    const syncRun = await db
      .selectFrom("sync_runs")
      .selectAll()
      .where("id", "=", String(summary.syncRunId))
      .executeTakeFirstOrThrow();

    expect(syncRun.generated_macro).toContain(
      '["https://assets.example.com/apply-batch-test/old.png", "https://assets.example.com/apply-batch-test/new.png"]',
    );
    expect(syncRun.world_acknowledgements).toEqual({ kingmaker: false, "stolen-fate": false });

    await fs.rm(rootDir, { recursive: true, force: true });
    await fs.rm(destinationRoot, { recursive: true, force: true });
  });
});
