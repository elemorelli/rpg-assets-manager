import { constants as fsConstants } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { convertToOgg } from "#server/routes/convert/to-ogg.ts";
import { runTrackedJob } from "#server/routes/jobs/index.ts";
import { hashBuffer } from "#server/utils/hash.ts";
import { pathExists } from "#server/utils/path-exists.ts";
import { registerAssetFile } from "#server/utils/register-asset-file.ts";
import { downloadYoutubeAudio } from "#server/ytdlp/index.ts";
import type { JobProgress } from "#utils/job.ts";
import type { YoutubeImportRequest, YoutubeImportResult } from "#utils/youtube-import.ts";

import { resolveImportTarget, type YoutubeImportTarget } from "./import-target.ts";

const WORK_DIR_PREFIX = "youtube-import-";
const CONVERTED_FILE_NAME = "converted.ogg";
const NO_COPY_FLAGS = 0;
const CANCELLED_RESULT: YoutubeImportResult = { imported: null };

const announceStage = (onProgress: (progress: JobProgress) => void, stage: string): void => {
  onProgress({ done: 0, total: 0, stage });
};

export const importYoutubeAudio = async (
  rootDir: string,
  workRoot: string,
  target: YoutubeImportTarget,
  onProgress: (progress: JobProgress) => void,
  signal: AbortSignal,
): Promise<YoutubeImportResult> => {
  const workDir = await fs.mkdtemp(path.join(workRoot, WORK_DIR_PREFIX));

  try {
    announceStage(onProgress, "downloading");

    const downloadedPath = await downloadYoutubeAudio(
      target.url,
      workDir,
      (progress) => onProgress({ ...progress, stage: "downloading" }),
      signal,
    );

    announceStage(onProgress, "converting");

    const convertedPath = path.join(workDir, CONVERTED_FILE_NAME);

    await convertToOgg(downloadedPath, convertedPath, signal);

    // Last cancellation point: past here the tree and the DB are written together.
    if (signal.aborted) {
      return CANCELLED_RESULT;
    }

    announceStage(onProgress, "registering");

    const absoluteDestination = path.join(rootDir, target.relativePath);
    const copyFlags = target.overwrite ? NO_COPY_FLAGS : fsConstants.COPYFILE_EXCL;

    await fs.mkdir(path.dirname(absoluteDestination), { recursive: true });
    await fs.copyFile(convertedPath, absoluteDestination, copyFlags);

    const [stat, content] = await Promise.all([
      fs.stat(absoluteDestination),
      fs.readFile(absoluteDestination),
    ]);
    const hash = await hashBuffer(content);

    await registerAssetFile(target.relativePath, {
      size: stat.size,
      mtime: stat.mtime,
      hash,
      tags: target.tags,
    });

    return { imported: target.relativePath };
  } catch (error) {
    if (signal.aborted) {
      return CANCELLED_RESULT;
    }

    throw error;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

export const youtubeImportHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const target = resolveImportTarget(request.body as Partial<YoutubeImportRequest> | undefined);
    const absoluteDestination = path.join(assetTreeRoot, target.relativePath);

    if (!target.overwrite && (await pathExists(absoluteDestination))) {
      throw new HttpError("File already exists", HTTP_STATUS.conflict);
    }

    return await runTrackedJob(
      "youtube-import",
      "downloading",
      "YouTube import failed",
      (onProgress, signal) =>
        importYoutubeAudio(assetTreeRoot, os.tmpdir(), target, onProgress, signal),
      { cancellable: true },
    );
  });
