import { type RcloneCheckResult, rcloneCheck, rcloneDestination } from "#server/rclone/index.ts";
import { failJob, startJob, toErrorMessage } from "#utils/job.ts";
import { setCurrentJob } from "../jobs/index.ts";

export const reconcileHandler = (assetTreeRoot: string) => async (): Promise<RcloneCheckResult> => {
  let job = startJob("reconcile", "checking", 0);
  setCurrentJob(job);

  try {
    const result = await rcloneCheck(assetTreeRoot, rcloneDestination);

    setCurrentJob(null);

    return result;
  } catch (error) {
    const message = toErrorMessage(error, "reconciliation failed");

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
