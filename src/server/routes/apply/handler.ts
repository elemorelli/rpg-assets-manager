import { failJob, startJob } from "../../../utils/job.ts";
import {
  assetsPublicBaseUrl,
  cloudflareConfig,
  purgeCloudflareCache,
} from "../../cloudflare/index.ts";
import { db } from "../../db/index.ts";
import { rcloneDestination } from "../../rclone/index.ts";
import { setCurrentJob } from "../jobs/index.ts";
import { applyBatch } from "./applyBatch.ts";
import { dryRun } from "./config.ts";

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
      },
      (progress) => {
        job = { ...job, total: progress.total, done: progress.done };
        setCurrentJob(job);
      },
    );

    setCurrentJob(null);

    return summary;
  } catch (error) {
    const message = error instanceof Error ? error.message : "apply failed";

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
