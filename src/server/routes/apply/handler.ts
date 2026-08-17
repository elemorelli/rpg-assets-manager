import {
  assetsPublicBaseUrl,
  cloudflareConfig,
  purgeCloudflareCache,
} from "#server/cloudflare/index.ts";
import { db } from "#server/db/index.ts";
import { rcloneDestination } from "#server/rclone/index.ts";

import { runTrackedJob } from "../jobs/index.ts";
import { applyBatch } from "./batch.ts";
import { dryRun } from "./config.ts";
import { foundryWorldNames } from "./macro/config.ts";

export const applyBatchHandler = (assetTreeRoot: string) => async () => {
  const purge = async (urls: string[]): Promise<void> => {
    if (!cloudflareConfig) {
      return;
    }

    await purgeCloudflareCache(urls, cloudflareConfig);
  };

  return runTrackedJob("apply", "applying", "apply failed", (onProgress) =>
    applyBatch(
      db,
      {
        rootDir: assetTreeRoot,
        destinationRoot: rcloneDestination,
        baseUrl: assetsPublicBaseUrl,
        dryRun,
        purge,
        foundryWorldNames,
      },
      onProgress,
    ),
  );
};
