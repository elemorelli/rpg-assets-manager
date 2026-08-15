import fs from "node:fs/promises";
import path from "node:path";
import { HTTP_STATUS, HttpError } from "#server/errors/index.ts";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const deleteEntry = async (rootDir: string, requestedPath: string): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);

  if (relativePath === "") {
    throw new HttpError("Cannot delete the asset tree root", HTTP_STATUS.badRequest);
  }

  const absolutePath = path.join(rootDir, relativePath);

  await fs.rm(absolutePath, { recursive: true, force: false });
};
