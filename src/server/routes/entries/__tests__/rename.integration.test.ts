import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HttpError } from "#server/errors/index.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { renameEntry } from "../rename.ts";

const PREFIX = "rename-entry-test/";

describe("renameEntry (requires DATABASE_URL pointing at a running Postgres)", () => {
  const tempDir = useTempDir("rename-entry-");

  cleanupAssetsByPrefix(PREFIX, ["assets", "directories"]);
  destroyDbAfterAll();

  it("renames a file within its own directory", async () => {
    await fs.mkdir(path.join(tempDir.path, "rename-entry-test"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "rename-entry-test", "forest.png"),
      "fake-png-bytes",
    );

    await renameEntry(tempDir.path, `${PREFIX}forest.png`, "forest-renamed.png");

    await expect(
      fs.stat(path.join(tempDir.path, "rename-entry-test", "forest.png")),
    ).rejects.toThrow();
    expect(
      (await fs.stat(path.join(tempDir.path, "rename-entry-test", "forest-renamed.png"))).isFile(),
    ).toBe(true);
  });

  it("renames an entry nested in a subdirectory, keeping it in that directory", async () => {
    await fs.mkdir(path.join(tempDir.path, "rename-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "rename-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await renameEntry(tempDir.path, `${PREFIX}tiles/forest.png`, "forest-renamed.png");

    expect(
      (
        await fs.stat(path.join(tempDir.path, "rename-entry-test", "tiles", "forest-renamed.png"))
      ).isFile(),
    ).toBe(true);
  });

  it("rejects when the new name already exists in that directory", async () => {
    await fs.mkdir(path.join(tempDir.path, "rename-entry-test"), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, "rename-entry-test", "a.png"), "a");
    await fs.writeFile(path.join(tempDir.path, "rename-entry-test", "b.png"), "b");

    await expect(renameEntry(tempDir.path, `${PREFIX}a.png`, "b.png")).rejects.toThrow(HttpError);
  });

  it("rejects a new name that tries to escape the current directory", async () => {
    await fs.mkdir(path.join(tempDir.path, "rename-entry-test", "tiles"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "rename-entry-test", "tiles", "forest.png"),
      "fake-png-bytes",
    );

    await expect(
      renameEntry(tempDir.path, `${PREFIX}tiles/forest.png`, "../../../escaped.png"),
    ).rejects.toThrow(UnsafePathError);
  });

  it("rejects an unsafe current path", async () => {
    await expect(renameEntry(tempDir.path, "../escaped.png", "renamed.png")).rejects.toThrow(
      UnsafePathError,
    );
  });

  it("carries the assets row over to the renamed path", async () => {
    await fs.mkdir(path.join(tempDir.path, "rename-entry-test"), { recursive: true });
    await fs.writeFile(
      path.join(tempDir.path, "rename-entry-test", "forest.png"),
      "fake-png-bytes",
    );
    await db
      .insertInto("assets")
      .values({ path: `${PREFIX}forest.png`, size: 14, mtime: new Date(), hash: "known-hash" })
      .execute();

    await renameEntry(tempDir.path, `${PREFIX}forest.png`, "forest-renamed.png");

    const movedRow = await db
      .selectFrom("assets")
      .select("hash")
      .where("path", "=", `${PREFIX}forest-renamed.png`)
      .executeTakeFirstOrThrow();

    expect(movedRow.hash).toEqual("known-hash");
  });
});
