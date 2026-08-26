import fs from "node:fs/promises";
import path from "node:path";

import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

export const createDirectory = async (rootDir: string, requestedPath: string): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const absolutePath = path.join(rootDir, relativePath);

  await fs.mkdir(absolutePath, { recursive: false });

  await ensureDirectoryChain(relativePath);
  await applyAggregateDelta(getParentPath(relativePath), {
    size: 0,
    fileCount: 0,
    folderCount: 1,
  });
};

export const createDirectoryHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as FilesPathBody | undefined;

    await createDirectory(assetTreeRoot, body?.path ?? "");

    return { created: true };
  });
