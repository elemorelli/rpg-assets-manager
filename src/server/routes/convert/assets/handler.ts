import path from "node:path";

import { db } from "#server/db/index.ts";
import { withHttpErrorHandling } from "#server/errors/index.ts";
import type { FilesPathBody } from "#server/routes/files/path-body.ts";
import { runTrackedJob } from "#server/routes/jobs/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

import { convertAssets } from "./convert.ts";

export const convertAssetsHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as FilesPathBody | undefined;
    const relativeDir = resolveSafeRelativePath(body?.path ?? "");
    const rootDir = path.join(assetTreeRoot, relativeDir);

    return await runTrackedJob("convert", "converting", "conversion failed", (onProgress) =>
      convertAssets(db, rootDir, relativeDir, onProgress),
    );
  });
