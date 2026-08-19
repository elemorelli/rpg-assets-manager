import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Kysely } from "kysely";

import { invalidateLocalHashIndex } from "#server/asset-index-cache/index.ts";
import { type DB, db } from "#server/db/index.ts";
import { applyAggregateDelta } from "#server/directory-aggregates/apply-aggregate-delta.ts";
import { ensureDirectoryChain } from "#server/directory-aggregates/ensure-directory-chain.ts";
import { HTTP_STATUS, HttpError, withHttpErrorHandling } from "#server/errors/index.ts";
import { createIncrementalHasher, type IncrementalHasher } from "#server/utils/hash.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { getParentPath } from "#utils/directory-path.ts";

export type UploadableStream = Readable & { truncated: boolean };

const createHashingTransform = (hasher: IncrementalHasher): Transform =>
  new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hasher.update(chunk);
      callback(null, chunk);
    },
  });

const isFileAlreadyExistsError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "EEXIST";

export const uploadFile = async (
  db: Kysely<DB>,
  rootDir: string,
  targetDirPath: string,
  fileName: string,
  content: UploadableStream,
  overwrite = false,
): Promise<void> => {
  const relativeDir = resolveSafeRelativePath(targetDirPath);
  const relativeFile = resolveSafeRelativePath(path.posix.join(relativeDir, fileName));
  const absolutePath = path.join(rootDir, relativeFile);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const hasher = await createIncrementalHasher();

  try {
    await pipeline(
      content,
      createHashingTransform(hasher),
      createWriteStream(absolutePath, { flags: overwrite ? "w" : "wx" }),
    );
  } catch (caught) {
    if (isFileAlreadyExistsError(caught)) {
      throw new HttpError("File already exists", HTTP_STATUS.conflict);
    }

    throw caught;
  }

  if (content.truncated) {
    await fs.unlink(absolutePath);

    throw new HttpError(
      "Uploaded file exceeds the maximum allowed size",
      HTTP_STATUS.payloadTooLarge,
    );
  }

  const stat = await fs.stat(absolutePath);
  const hash = hasher.digest();

  const previousRow = await db
    .selectFrom("assets")
    .select("size")
    .where("path", "=", relativeFile)
    .executeTakeFirst();
  const previousSize = previousRow ? Number(previousRow.size) : undefined;

  await db
    .insertInto("assets")
    .values({ path: relativeFile, size: stat.size, mtime: stat.mtime, hash })
    .onConflict((oc) =>
      oc.column("path").doUpdateSet({
        size: stat.size,
        mtime: stat.mtime,
        hash,
        scanned_at: new Date(),
      }),
    )
    .execute();

  const parentDir = getParentPath(relativeFile);

  await ensureDirectoryChain(db, parentDir);
  await applyAggregateDelta(db, parentDir, {
    size: stat.size - (previousSize ?? 0),
    fileCount: previousSize === undefined ? 1 : 0,
    folderCount: 0,
  });

  invalidateLocalHashIndex(db);
};

interface UploadField {
  type?: string;
  value?: unknown;
}

const extractTargetDir = (fields: Record<string, unknown>): string => {
  const field = fields.path as UploadField | undefined;

  if (!field || typeof field.value !== "string") {
    return "";
  }

  return field.value;
};

const extractOverwrite = (fields: Record<string, unknown>): boolean => {
  const field = fields.overwrite as UploadField | undefined;

  return field?.value === "true";
};

export const uploadFileHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request, reply) => {
    const uploadedFile = await request.file();

    if (!uploadedFile) {
      reply.code(HTTP_STATUS.badRequest).send({ error: "No file uploaded" });

      return undefined;
    }

    const targetDir = extractTargetDir(uploadedFile.fields);
    const overwrite = extractOverwrite(uploadedFile.fields);

    await uploadFile(
      db,
      assetTreeRoot,
      targetDir,
      uploadedFile.filename,
      uploadedFile.file,
      overwrite,
    );

    return { uploaded: uploadedFile.filename };
  });
