import type { FastifyRequest } from "fastify";
import { db } from "#server/db/index.ts";
import { failJob, startJob, toErrorMessage } from "#utils/job.ts";
import { setCurrentJob } from "../../jobs/index.ts";
import { rescanAssets } from "./rescan.ts";

interface RescanRequestBody {
  forceRehash?: boolean;
}

export const rescanHandler = (assetTreeRoot: string) => async (request: FastifyRequest) => {
  const body = request.body as RescanRequestBody | undefined;

  let job = startJob("rescan", "hashing", 0);
  setCurrentJob(job);

  try {
    const summary = await rescanAssets(
      db,
      assetTreeRoot,
      { forceRehash: body?.forceRehash ?? false },
      (progress) => {
        job = { ...job, total: progress.total, done: progress.done };
        setCurrentJob(job);
      },
    );

    setCurrentJob(null);

    return summary;
  } catch (error) {
    const message = toErrorMessage(error, "rescan failed");

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
