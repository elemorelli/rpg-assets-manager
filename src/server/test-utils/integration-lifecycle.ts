import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach } from "vitest";

import { db } from "#server/db/index.ts";

// Shared setup/teardown for *.integration.test.ts files, which all run against
// the real dev Postgres and (for filesystem-touching ones) real temp
// directories: no dedicated test database, no per-test transaction rollback,
// so every file is responsible for cleaning up exactly what it created. See
// the memory on the integration/unit test boundary for which files this
// applies to and which stay fully custom (raw SQL assertions, full-app
// wiring, external binaries).

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

type PrefixCleanupTable = "assets" | "remote_assets";

export const cleanupAssetsByPrefix = (
  pathPrefix: string,
  tables: readonly PrefixCleanupTable[] = ["assets"],
): void => {
  afterEach(async () => {
    for (const table of tables) {
      await db.deleteFrom(table).where("path", "like", `${pathPrefix}%`).execute();
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
