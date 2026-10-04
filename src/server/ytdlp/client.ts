import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";

import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { execFileAsync } from "#server/utils/exec.ts";
import type { JobProgress } from "#utils/job.ts";
import {
  extractYtdlpErrorMessage,
  parseYtdlpMetadata,
  parseYtdlpProgressLine,
  type YoutubeMetadata,
  YTDLP_PROGRESS_TEMPLATE,
} from "#utils/youtube-import.ts";

import { getYtdlpBinary } from "./config.ts";

const METADATA_TIMEOUT_MS = 30_000;
const BYTES_PER_KILOBYTE = 1024;
const BYTES_PER_MEGABYTE = BYTES_PER_KILOBYTE * BYTES_PER_KILOBYTE;
const METADATA_MAX_BUFFER_MEGABYTES = 64;
const METADATA_MAX_BUFFER_BYTES = METADATA_MAX_BUFFER_MEGABYTES * BYTES_PER_MEGABYTE;
const DOWNLOAD_BASENAME = "source";
const PARTIAL_DOWNLOAD_SUFFIX = ".part";
const SAFETY_ARGS = ["--ignore-config", "--no-playlist", "--js-runtimes", "node"];
const MISSING_BINARY_MESSAGE = "yt-dlp is not installed";

interface ExecFailure {
  code?: unknown;
  killed?: unknown;
  stderr?: unknown;
}

const isMissingBinaryError = (error: unknown): boolean =>
  (error as ExecFailure | undefined)?.code === "ENOENT";

const isTimeoutError = (error: unknown): boolean =>
  (error as ExecFailure | undefined)?.killed === true;

const readStderr = (error: unknown): string => {
  const stderr = (error as ExecFailure | undefined)?.stderr;

  return typeof stderr === "string" ? stderr : "";
};

const toMetadataHttpError = (error: unknown): HttpError => {
  if (isMissingBinaryError(error)) {
    return new HttpError(MISSING_BINARY_MESSAGE, HTTP_STATUS.badGateway);
  }

  if (isTimeoutError(error)) {
    return new HttpError("Timed out fetching video info", HTTP_STATUS.gatewayTimeout);
  }

  return new HttpError(extractYtdlpErrorMessage(readStderr(error)), HTTP_STATUS.badGateway);
};

const parseMetadataOutput = (stdout: string): YoutubeMetadata => {
  let raw: unknown;

  try {
    raw = JSON.parse(stdout);
  } catch {
    throw new HttpError("yt-dlp returned unreadable video info", HTTP_STATUS.badGateway);
  }

  try {
    return parseYtdlpMetadata(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unreadable video info";

    throw new HttpError(message, HTTP_STATUS.badRequest);
  }
};

export const fetchYoutubeMetadata = async (
  url: string,
  timeoutMs: number = METADATA_TIMEOUT_MS,
): Promise<YoutubeMetadata> => {
  const args = ["--dump-json", ...SAFETY_ARGS, "--", url];
  let stdout: string;

  try {
    const result = await execFileAsync(getYtdlpBinary(), args, {
      timeout: timeoutMs,
      maxBuffer: METADATA_MAX_BUFFER_BYTES,
    });

    stdout = result.stdout;
  } catch (error) {
    throw toMetadataHttpError(error);
  }

  return parseMetadataOutput(stdout);
};

const findDownloadedFile = async (directory: string): Promise<string> => {
  const names = await fs.readdir(directory);
  const downloadedName = names.find(
    (name) => name.startsWith(`${DOWNLOAD_BASENAME}.`) && !name.endsWith(PARTIAL_DOWNLOAD_SUFFIX),
  );

  if (downloadedName === undefined) {
    throw new Error("yt-dlp finished without producing a file");
  }

  return path.join(directory, downloadedName);
};

export const downloadYoutubeAudio = (
  url: string,
  directory: string,
  onProgress: (progress: JobProgress) => void,
  signal: AbortSignal,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const outputTemplate = path.join(directory, `${DOWNLOAD_BASENAME}.%(ext)s`);
    const args = [
      "-f",
      "bestaudio",
      ...SAFETY_ARGS,
      "--newline",
      "--progress-template",
      YTDLP_PROGRESS_TEMPLATE,
      "-o",
      outputTemplate,
      "--",
      url,
    ];
    const child = spawn(getYtdlpBinary(), args, { signal, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    createInterface({ input: child.stdout }).on("line", (line) => {
      const progress = parseYtdlpProgressLine(line);

      if (progress) {
        onProgress(progress);
      }
    });

    child.on("error", (error) => {
      if (isMissingBinaryError(error)) {
        reject(new HttpError(MISSING_BINARY_MESSAGE, HTTP_STATUS.badGateway));

        return;
      }

      reject(error);
    });

    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new HttpError(extractYtdlpErrorMessage(stderr), HTTP_STATUS.badGateway));

        return;
      }

      findDownloadedFile(directory).then(resolve, reject);
    });
  });
