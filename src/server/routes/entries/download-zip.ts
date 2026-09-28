import fs from "node:fs/promises";
import path from "node:path";
import type { PassThrough, Readable } from "node:stream";
import { ZipFile } from "yazl";

import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { buildAttachmentDisposition } from "#server/utils/content-disposition.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { walkDirectory } from "#server/utils/walk-directory.ts";

import {
  buildZipFileName,
  planZipEntries,
  type ZipEntryPlan,
  type ZipSelection,
} from "./zip-plan.ts";

interface DownloadZipQuery {
  path?: string | string[];
}

const resolveZipSelection = async (
  rootDir: string,
  requestedPath: string,
): Promise<ZipSelection> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot download the asset tree root", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);
  const stat = await fs.stat(absolutePath);

  if (!stat.isDirectory()) {
    return { type: "file", relativePath };
  }

  const walkedEntries = await walkDirectory(absolutePath);
  const nestedFiles = walkedEntries
    .filter((walkedEntry) => walkedEntry.dirent.isFile())
    .map((walkedEntry) => walkedEntry.relativePath);

  return { type: "directory", relativePath, nestedFiles };
};

export const resolveZipSelections = async (
  rootDir: string,
  requestedPaths: string[],
): Promise<ZipSelection[]> => {
  if (requestedPaths.length === 0) {
    throw new HttpError("No paths to download", HTTP_STATUS.badRequest);
  }

  return Promise.all(
    requestedPaths.map((requestedPath) => resolveZipSelection(rootDir, requestedPath)),
  );
};

const toPathList = (queryPath: string | string[] | undefined): string[] => {
  if (queryPath === undefined) {
    return [];
  }

  return Array.isArray(queryPath) ? queryPath : [queryPath];
};

export const createZipStream = (rootDir: string, zipEntries: ZipEntryPlan[]): Readable => {
  const zipFile = new ZipFile();
  const outputStream = zipFile.outputStream as PassThrough;

  // A file that vanishes or changes mid-archive emits "error"; unhandled, it would crash the server.
  zipFile.on("error", (error: Error) => {
    outputStream.destroy(error);
  });

  for (const zipEntry of zipEntries) {
    const absolutePath = path.join(rootDir, zipEntry.relativePath);

    // Assets are already compressed media (webp, ogg), so deflating again only costs CPU.
    zipFile.addFile(absolutePath, zipEntry.archivePath, { compress: false });
  }

  zipFile.end();

  return outputStream;
};

export const downloadZipHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const query = request.query as DownloadZipQuery;
    const requestedPaths = toPathList(query.path);
    const selections = await resolveZipSelections(assetTreeRoot, requestedPaths);
    const zipEntries = planZipEntries(selections);
    const zipFileName = buildZipFileName(selections.map((selection) => selection.relativePath));

    reply.header("Content-Disposition", buildAttachmentDisposition(zipFileName));
    reply.type("application/zip");

    return reply.send(createZipStream(assetTreeRoot, zipEntries));
  });
