import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach } from "vitest";

import { db } from "#server/db/index.ts";

// Integration files share one test database with no per-test rollback, so each cleans up exactly what it created.

export interface TempDirHandle {
  path: string;
}

export const useTempDir = (namePrefix: string): TempDirHandle => {
  const handle: TempDirHandle = { path: "" };

  beforeEach(async () => {
    handle.path = await fs.mkdtemp(path.join(os.tmpdir(), namePrefix));
  });

  afterEach(async () => {
    await fs.rm(handle.path, { recursive: true, force: true });
  });

  return handle;
};

type PrefixCleanupTable = "assets" | "remote_assets" | "directories";

export const cleanupAssetsByPrefix = (
  pathPrefix: string,
  tables: readonly PrefixCleanupTable[] = ["assets"],
): void => {
  afterEach(async () => {
    for (const table of tables) {
      await db.deleteFrom(table).where("path", "like", `${pathPrefix}%`).execute();

      // The "%" match needs content after the prefix, so it misses the directory row for the prefix itself.
      if (table === "directories" && pathPrefix.endsWith("/")) {
        await db.deleteFrom("directories").where("path", "=", pathPrefix.slice(0, -1)).execute();
      }
    }
  });
};

export const cleanupAssetRenamesByPrefix = (pathPrefix: string): void => {
  afterEach(async () => {
    await db
      .deleteFrom("asset_renames")
      .where((eb) =>
        eb.or([eb("old_path", "like", `${pathPrefix}%`), eb("new_path", "like", `${pathPrefix}%`)]),
      )
      .execute();
  });
};

export const useCreatedSyncRunIds = (): number[] => {
  const syncRunIds: number[] = [];

  afterEach(async () => {
    for (const syncRunId of syncRunIds) {
      await db.deleteFrom("sync_runs").where("id", "=", String(syncRunId)).execute();
    }
    syncRunIds.length = 0;
  });

  return syncRunIds;
};

export const destroyDbAfterAll = (): void => {
  afterAll(async () => {
    await db.destroy();
  });
};
