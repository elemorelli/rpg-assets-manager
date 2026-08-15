import fs from "node:fs/promises";
import path from "node:path";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";
import { mimeTypeForFile } from "#utils/preview.ts";

export const readRawFile = async (
  rootDir: string,
  requestedPath: string,
): Promise<{ mimeType: string; content: Buffer }> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const mimeType = mimeTypeForFile(relativePath);

  if (!mimeType) {
    throw new HttpError("Unsupported file type", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);
  const content = await fs.readFile(absolutePath);

  return { mimeType, content };
};
