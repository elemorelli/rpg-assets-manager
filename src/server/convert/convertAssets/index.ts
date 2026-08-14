import fs from "node:fs/promises";
import path from "node:path";
import { failJob, startJob } from "../../../core/job.ts";
import { setCurrentJob } from "../../jobs/jobStore.ts";
import { getConversionPlan } from "../convertPlan/index.ts";
import { convertToOgg } from "../convertToOgg.ts";
import { convertToWebp } from "../convertToWebp.ts";

export interface ConversionSummary {
  converted: number;
  conflicts: number;
}

export interface ConversionProgress {
  done: number;
  total: number;
}

export const convertAssets = async (
  rootDir: string,
  onProgress?: (progress: ConversionProgress) => void,
): Promise<ConversionSummary> => {
  const plan = await getConversionPlan(rootDir);
  const total = plan.candidates.length;

  onProgress?.({ done: 0, total });

  for (const [index, candidate] of plan.candidates.entries()) {
    const sourcePath = path.join(rootDir, candidate.relativePath);
    const destinationPath = path.join(rootDir, candidate.destinationPath);

    if (candidate.kind === "image") {
      await convertToWebp(sourcePath, destinationPath);
    } else {
      await convertToOgg(sourcePath, destinationPath);
    }

    await fs.rm(sourcePath);

    onProgress?.({ done: index + 1, total });
  }

  return { converted: plan.candidates.length, conflicts: plan.conflicts.length };
};

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
    const message = error instanceof Error ? error.message : "conversion failed";

    setCurrentJob(failJob(job, message));
    throw error;
  }
};
