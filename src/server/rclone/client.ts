import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { execFileAsync } from "#server/utils/exec.ts";

import { parseCombinedReport, type RcloneCheckResult } from "./combined-report.ts";
import { parseCheckStats, parseCompletedFilePath } from "./json-log.ts";

const writeRelativePathsListFile = async (relativePaths: string[]): Promise<string> => {
  const listDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-list-"));
  const listFilePath = path.join(listDir, "files.txt");

  await fs.writeFile(listFilePath, relativePaths.join("\n"));

  return listFilePath;
};

interface RunRcloneCommandOptions {
  acceptableExitCodes?: number[];
  onLine?: (line: string) => void;
}

const DEFAULT_ACCEPTABLE_EXIT_CODES = [0];

const runRcloneCommand = (args: string[], options: RunRcloneCommandOptions = {}): Promise<void> =>
  new Promise((resolve, reject) => {
    const acceptableExitCodes = options.acceptableExitCodes ?? DEFAULT_ACCEPTABLE_EXIT_CODES;
    const child = spawn("rclone", [...args, "-v", "--use-json-log"]);
    let lineBuffer = "";
    let lastNonEmptyLine = "";

    child.stderr.on("data", (chunk: Buffer) => {
      lineBuffer += chunk.toString("utf8");
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.length > 0) {
          lastNonEmptyLine = line;
        }

        options.onLine?.(line);
      }
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== null && acceptableExitCodes.includes(code)) {
        resolve();
        return;
      }

      reject(new Error(`rclone exited with code ${code}: ${lastNonEmptyLine}`));
    });
  });

export const rcloneCopy = async (
  sourceRoot: string,
  destinationRoot: string,
  relativePaths: string[],
  onFileDone?: (relativePath: string) => void,
): Promise<void> => {
  const listFilePath = await writeRelativePathsListFile(relativePaths);

  await runRcloneCommand(
    ["copy", sourceRoot, destinationRoot, "--files-from-raw", listFilePath, "--s3-no-check-bucket"],
    {
      onLine: (line) => {
        const completedPath = parseCompletedFilePath(line);

        if (completedPath !== null) {
          onFileDone?.(completedPath);
        }
      },
    },
  );
};

export const rcloneDelete = async (
  destinationRoot: string,
  relativePaths: string[],
  onFileDone?: (relativePath: string) => void,
): Promise<void> => {
  const listFilePath = await writeRelativePathsListFile(relativePaths);

  await runRcloneCommand(
    ["delete", destinationRoot, "--files-from-raw", listFilePath, "--s3-no-check-bucket"],
    {
      onLine: (line) => {
        const completedPath = parseCompletedFilePath(line);

        if (completedPath !== null) {
          onFileDone?.(completedPath);
        }
      },
    },
  );
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
const CHECK_STATS_INTERVAL = "500ms";

export const rcloneCheck = async (
  sourceRoot: string,
  destinationRoot: string,
  onProgress?: (progress: { done: number; total: number }) => void,
): Promise<RcloneCheckResult> => {
  const reportDir = await fs.mkdtemp(path.join(os.tmpdir(), "rclone-check-"));
  const reportFilePath = path.join(reportDir, "combined.txt");

  try {
    await runRcloneCommand(
      [
        "check",
        sourceRoot,
        destinationRoot,
        "--combined",
        reportFilePath,
        "--stats",
        CHECK_STATS_INTERVAL,
      ],
      {
        acceptableExitCodes: [0, RCLONE_CHECK_DIFFERENCES_FOUND_EXIT_CODE],
        onLine: (line) => {
          const stats = parseCheckStats(line);

          if (stats !== null) {
            onProgress?.(stats);
          }
        },
      },
    );

    const reportContent = await fs.readFile(reportFilePath, "utf8");

    return parseCombinedReport(reportContent);
  } finally {
    await fs.rm(reportDir, { recursive: true, force: true });
  }
};
