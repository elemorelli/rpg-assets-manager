import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export interface WalkedEntry {
  relativePath: string;
  entryPath: string;
  dirent: Dirent;
}

const collectEntries = async (
  rootDir: string,
  currentDir: string,
  results: WalkedEntry[],
): Promise<void> => {
  const dirents = await fs.readdir(currentDir, { withFileTypes: true });

  for (const dirent of dirents) {
    const entryPath = path.join(currentDir, dirent.name);
    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

    results.push({ relativePath, entryPath, dirent });

    if (dirent.isDirectory()) {
      await collectEntries(rootDir, entryPath, results);
    }
  }
};

export const walkDirectory = async (rootDir: string): Promise<WalkedEntry[]> => {
  const results: WalkedEntry[] = [];

  await collectEntries(rootDir, rootDir, results);

  return results;
};
