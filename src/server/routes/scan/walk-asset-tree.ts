import fs from "node:fs/promises";
import path from "node:path";

interface WalkedFile {
  relativePath: string;
  size: number;
  mtimeMs: number;
}

const walkDir = async (
  rootDir: string,
  currentDir: string,
  results: WalkedFile[],
): Promise<void> => {
  const entries = await fs.readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await walkDir(rootDir, entryPath, results);

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stat = await fs.stat(entryPath);
    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

    // Truncated to match Postgres's millisecond precision, or unchanged files never compare equal.
    results.push({ relativePath, size: stat.size, mtimeMs: Math.trunc(stat.mtimeMs) });
  }
};

export const walkAssetTree = async (rootDir: string): Promise<WalkedFile[]> => {
  const results: WalkedFile[] = [];

  await walkDir(rootDir, rootDir, results);

  return results;
};
