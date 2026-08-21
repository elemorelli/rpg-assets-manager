import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { getRemoteHashIndex } from "#server/asset-index-cache/index.ts";
import { db } from "#server/db/index.ts";
import {
  cleanupAssetRenamesByPrefix,
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useCreatedSyncRunIds,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";

import { applyBatch } from "../batch.ts";

const PREFIX = "apply-batch-test/";

describe("applyBatch (requires DATABASE_URL and the real rclone binary)", () => {
  const rootDir = useTempDir("apply-batch-root-");
  const destinationRoot = useTempDir("apply-batch-dest-");
  const createdSyncRunIds = useCreatedSyncRunIds();

  cleanupAssetsByPrefix(PREFIX, ["assets", "remote_assets"]);
  cleanupAssetRenamesByPrefix(PREFIX);
  destroyDbAfterAll();

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
    });

    createdSyncRunIds.push(summary.syncRunId);

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

    await fs.mkdir(path.join(rootDir.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(rootDir.path, `${PREFIX}added.png`), "added-bytes");
    await fs.writeFile(path.join(destinationRoot.path, "placeholder"), "");
    await fs.mkdir(path.join(destinationRoot.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(destinationRoot.path, `${PREFIX}stale.png`), "stale-bytes");

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
        rootDir: rootDir.path,
        destinationRoot: destinationRoot.path,
        baseUrl: "https://assets.example.com",
        dryRun: false,
        purge,
      },
      onProgress,
    );

    createdSyncRunIds.push(summary.syncRunId);

    expect(summary.outcome).toBe("applied");
    expect(await fs.readFile(path.join(destinationRoot.path, `${PREFIX}added.png`), "utf8")).toBe(
      "added-bytes",
    );
    await expect(
      fs.access(path.join(destinationRoot.path, `${PREFIX}stale.png`)),
    ).rejects.toThrow();

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
  });

  it("on a real apply with renames, records the rename in the asset_renames log", async () => {
    await fs.mkdir(path.join(destinationRoot.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(destinationRoot.path, `${PREFIX}old.png`), "renamed-bytes");

    await db
      .insertInto("assets")
      .values([{ path: `${PREFIX}new.png`, size: 13, mtime: new Date(), hash: "hash-rename" }])
      .execute();
    await db
      .insertInto("remote_assets")
      .values([{ path: `${PREFIX}old.png`, size: 13, hash: "hash-rename" }])
      .execute();

    const summary = await applyBatch(db, {
      rootDir: rootDir.path,
      destinationRoot: destinationRoot.path,
      baseUrl: "https://assets.example.com",
      dryRun: false,
      purge: vi.fn().mockResolvedValue(undefined),
    });

    createdSyncRunIds.push(summary.syncRunId);

    expect(summary.renamed).toBe(1);

    const renameRow = await db
      .selectFrom("asset_renames")
      .selectAll()
      .where("old_path", "=", `${PREFIX}old.png`)
      .executeTakeFirstOrThrow();
    expect(renameRow.new_path).toBe(`${PREFIX}new.png`);
  });

  it("records a converted file as a rename and clears its previous_hash once applied", async () => {
    await fs.mkdir(path.join(rootDir.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(rootDir.path, `${PREFIX}theme.ogg`), "converted-bytes");
    await fs.mkdir(path.join(destinationRoot.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(destinationRoot.path, `${PREFIX}theme.wav`), "original-bytes");

    await db
      .insertInto("assets")
      .values([
        {
          path: `${PREFIX}theme.ogg`,
          size: 15,
          mtime: new Date(),
          hash: "hash-ogg",
          previous_hash: "hash-wav",
        },
      ])
      .execute();
    await db
      .insertInto("remote_assets")
      .values([{ path: `${PREFIX}theme.wav`, size: 13, hash: "hash-wav" }])
      .execute();

    const summary = await applyBatch(db, {
      rootDir: rootDir.path,
      destinationRoot: destinationRoot.path,
      baseUrl: "https://assets.example.com",
      dryRun: false,
      purge: vi.fn().mockResolvedValue(undefined),
    });

    createdSyncRunIds.push(summary.syncRunId);

    expect(summary.renamed).toBe(1);

    const renameRow = await db
      .selectFrom("asset_renames")
      .selectAll()
      .where("old_path", "=", `${PREFIX}theme.wav`)
      .executeTakeFirstOrThrow();
    expect(renameRow.new_path).toBe(`${PREFIX}theme.ogg`);

    const assetRow = await db
      .selectFrom("assets")
      .select("previous_hash")
      .where("path", "=", `${PREFIX}theme.ogg`)
      .executeTakeFirstOrThrow();
    expect(assetRow.previous_hash).toBeNull();
  });

  it("invalidates the cached remote hash index after mirroring changes", async () => {
    await fs.mkdir(path.join(rootDir.path, PREFIX.replace(/\/$/, "")), { recursive: true });
    await fs.writeFile(path.join(rootDir.path, `${PREFIX}added.png`), "added-bytes");
    await fs.writeFile(path.join(destinationRoot.path, "placeholder"), "");
    await db
      .insertInto("assets")
      .values([{ path: `${PREFIX}added.png`, size: 11, mtime: new Date(), hash: "hash-added" }])
      .execute();

    await getRemoteHashIndex(db);
    const summary = await applyBatch(db, {
      rootDir: rootDir.path,
      destinationRoot: destinationRoot.path,
      baseUrl: "https://assets.example.com",
      dryRun: false,
      purge: vi.fn().mockResolvedValue(undefined),
    });
    createdSyncRunIds.push(summary.syncRunId);

    const remoteIndex = await getRemoteHashIndex(db);
    expect(remoteIndex.get(`${PREFIX}added.png`)?.hash).toBe("hash-added");
  });
});
