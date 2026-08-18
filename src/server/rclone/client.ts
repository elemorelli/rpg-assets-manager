import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execFileAsync } from "#server/utils/exec.ts";

import { parseCombinedReport, type RcloneCheckResult } from "./combined-report.ts";

const writeRelativePathsListFile = async (relativePaths: string[]): Promise<string> => {
  const listDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-list-"));
  const listFilePath = path.join(listDir, "files.txt");

  await fs.writeFile(listFilePath, relativePaths.join("\n"));

  return listFilePath;
};

export const rcloneCopy = async (
  sourceRoot: string,
  destinationRoot: string,
  relativePaths: string[],
): Promise<void> => {
  const listFilePath = await writeRelativePathsListFile(relativePaths);

  await execFileAsync("rclone", [
    "copy",
    sourceRoot,
    destinationRoot,
    "--files-from-raw",
    listFilePath,
    "--s3-no-check-bucket",
  ]);
};

export const rcloneDelete = async (
  destinationRoot: string,
  relativePaths: string[],
): Promise<void> => {
  const listFilePath = await writeRelativePathsListFile(relativePaths);

  await execFileAsync("rclone", [
    "delete",
    destinationRoot,
    "--files-from-raw",
    listFilePath,
    "--s3-no-check-bucket",
  ]);
};

export const rcloneMoveTo = async (
  destinationRoot: string,
  oldRelativePath: string,
  newRelativePath: string,
): Promise<void> => {
  await execFileAsync("rclone", [
    "moveto",
    `${destinationRoot}/${oldRelativePath}`,
    `${destinationRoot}/${newRelativePath}`,
    "--s3-no-check-bucket",
  ]);
};

const RCLONE_CHECK_DIFFERENCES_FOUND_EXIT_CODE = 1;

export const rcloneCheck = async (
  sourceRoot: string,
  destinationRoot: string,
): Promise<RcloneCheckResult> => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-check-"));
  const reportFilePath = path.join(reportDir, "combined.txt");

  try {
    try {
      await execFileAsync("rclone", [
        "check",
        sourceRoot,
        destinationRoot,
        "--combined",
        reportFilePath,
      ]);
    } catch (error) {
      const exitCode = (error as { code?: number }).code;

      if (exitCode !== RCLONE_CHECK_DIFFERENCES_FOUND_EXIT_CODE) {
        throw error;
      }
    }

    const reportContent = await fs.readFile(reportFilePath, "utf8");

    return parseCombinedReport(reportContent);
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
};
