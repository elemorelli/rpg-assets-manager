import {
  assetsPublicBaseUrl,
  cloudflareConfig,
  purgeCloudflareCache,
} from "#server/cloudflare/index.ts";
import { db } from "#server/db/index.ts";
import { rcloneDestination } from "#server/rclone/index.ts";
import { failJob, startJob, toErrorMessage } from "#utils/job.ts";

import { setCurrentJob } from "../jobs/index.ts";
import { applyBatch } from "./batch.ts";
import { dryRun } from "./config.ts";
import { foundryWorldNames } from "./macro/config.ts";

export const applyBatchHandler = (assetTreeRoot: string) => async () => {
  let job = startJob("apply", "applying", 0);
  setCurrentJob(job);

  const purge = async (urls: string[]): Promise<void> => {
    if (!cloudflareConfig) {
      return;
    }

    await purgeCloudflareCache(urls, cloudflareConfig);
  };

  try {
    const summary = await applyBatch(
      db,
      {
        rootDir: assetTreeRoot,
        destinationRoot: rcloneDestination,
        baseUrl: assetsPublicBaseUrl,
        dryRun,
        purge,
        foundryWorldNames,
      },
      (progress) => {
        job = { ...job, total: progress.total, done: progress.done };
        setCurrentJob(job);
      },
    );

    setCurrentJob(null);

    return summary;
  } catch (error) {
    const message = toErrorMessage(error, "apply failed");

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
