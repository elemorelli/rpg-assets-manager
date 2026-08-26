import { type RcloneCheckResult, rcloneCheck, rcloneDestination } from "#server/rclone/index.ts";

import { runTrackedJob } from "../jobs/index.ts";

export const reconcileHandler = (assetTreeRoot: string) => async (): Promise<RcloneCheckResult> =>
  runTrackedJob(
    "reconcile",
    "checking",
    "reconciliation failed",
    (onProgress, signal) => rcloneCheck(assetTreeRoot, rcloneDestination, onProgress, signal),
    { cancellable: true },
  );
