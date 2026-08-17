import fs from "node:fs/promises";
import path from "node:path";
import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const uploadFile = async (
  db: Kysely<DB>,
  rootDir: string,
  targetDirPath: string,
  fileName: string,
  content: Buffer,
): Promise<void> => {
  const relativeDir = resolveSafeRelativePath(targetDirPath);
  const relativeFile = resolveSafeRelativePath(path.posix.join(relativeDir, fileName));
  const absolutePath = path.join(rootDir, relativeFile);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, { flag: "wx" });

  const stat = await fs.stat(absolutePath);
  const hash = await hashBuffer(content);

  await db
    .insertInto("assets")
    .values({ path: relativeFile, size: content.length, mtime: stat.mtime, hash })
    .onConflict((oc) =>
      oc.column("path").doUpdateSet({
        size: content.length,
        mtime: stat.mtime,
        hash,
        scanned_at: new Date(),
      }),
    )
    .execute();
};
