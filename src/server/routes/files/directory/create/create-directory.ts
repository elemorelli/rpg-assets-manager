import fs from "node:fs/promises";
import path from "node:path";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const createDirectory = async (rootDir: string, requestedPath: string): Promise<void> => {
  const relativePath = resolveSafeRelativePath(requestedPath);
  const absolutePath = path.join(rootDir, relativePath);

  await fs.mkdir(absolutePath, { recursive: false });
};
