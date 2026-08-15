import { failJob, startJob, toErrorMessage } from "#utils/job.ts";

import { setCurrentJob } from "../../jobs/index.ts";
import { convertAssets } from "./convert-assets.ts";

export const convertAssetsHandler = (assetTreeRoot: string) => async () => {
  let job = startJob("convert", "converting", 0);
  setCurrentJob(job);

  try {
    const summary = await convertAssets(assetTreeRoot, (progress) => {
      job = { ...job, total: progress.total, done: progress.done };
      setCurrentJob(job);
    });

    setCurrentJob(null);

    return summary;
  } catch (error) {
    const message = toErrorMessage(error, "conversion failed");

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
