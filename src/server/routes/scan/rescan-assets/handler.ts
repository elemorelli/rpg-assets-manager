import type { FastifyRequest } from "fastify";

import { db } from "#server/db/index.ts";
import { runTrackedJob } from "#server/routes/jobs/index.ts";

import { rescanAssets } from "./rescan.ts";

interface RescanRequestBody {
  forceRehash?: boolean;
}

export const rescanHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const body = request.body as RescanRequestBody | undefined;

  return runTrackedJob("rescan", "hashing", "rescan failed", (onProgress) =>
    rescanAssets(db, assetTreeRoot, { forceRehash: body?.forceRehash ?? false }, onProgress),
  );
};
