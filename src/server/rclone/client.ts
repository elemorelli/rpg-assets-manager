import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { parseCombinedReport, type RcloneCheckResult } from "./combined-report.ts";

const execFileAsync = promisify(execFile);

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
  ]);
};

export const rcloneDelete = async (
  destinationRoot: string,
  relativePaths: string[],
): Promise<void> => {
  const listFilePath = await writeRelativePathsListFile(relativePaths);

  await execFileAsync("rclone", ["delete", destinationRoot, "--files-from-raw", listFilePath]);
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

  await fs.rm(reportDir, { recursive: true, force: true });

  return parseCombinedReport(reportContent);
};
