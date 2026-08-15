import fs from "node:fs/promises";
import path from "node:path";
import { resolveSafeRelativePath } from "#server/utils/safe-path.ts";

export const uploadFile = async (
  rootDir: string,
  targetDirPath: string,
  fileName: string,
  content: Buffer,
): Promise<void> => {
  const relativeDir = resolveSafeRelativePath(targetDirPath);
  const relativeFile = resolveSafeRelativePath(path.posix.join(relativeDir, fileName));
  const absolutePath = path.join(rootDir, relativeFile);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, { flag: "wx" });
};
