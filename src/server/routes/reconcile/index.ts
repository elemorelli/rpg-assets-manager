import { type RcloneCheckResult, rcloneCheck, rcloneDestination } from "#server/rclone/index.ts";
import { failJob, startJob } from "#utils/job.ts";
import { setCurrentJob } from "../jobs/index.ts";

export const reconcileHandler = (assetTreeRoot: string) => async (): Promise<RcloneCheckResult> => {
  let job = startJob("reconcile", "checking", 0);
  setCurrentJob(job);

  try {
    const result = await rcloneCheck(assetTreeRoot, rcloneDestination);

    setCurrentJob(null);

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "reconciliation failed";

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
