import fs from "node:fs/promises";
import path from "node:path";
import { getConversionPlan } from "../plan/index.ts";
import { convertToOgg } from "./to-ogg.ts";
import { convertToWebp } from "./to-webp.ts";

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
