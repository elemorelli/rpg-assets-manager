import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

export interface WalkedEntry {
  relativePath: string;
  entryPath: string;
  dirent: Dirent;
}

export interface WalkDirectoryOptions {
  recursive?: boolean;
}

const collectEntries = async (
  rootDir: string,
  currentDir: string,
  results: WalkedEntry[],
  recursive: boolean,
): Promise<void> => {
  const dirents = await fs.readdir(currentDir, { withFileTypes: true });

  for (const dirent of dirents) {
    const entryPath = path.join(currentDir, dirent.name);
    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

    results.push({ relativePath, entryPath, dirent });

    if (dirent.isDirectory() && recursive) {
      await collectEntries(rootDir, entryPath, results, recursive);
    }
  }
};

export const walkDirectory = async (
  rootDir: string,
  options: WalkDirectoryOptions = {},
): Promise<WalkedEntry[]> => {
  const results: WalkedEntry[] = [];

  await collectEntries(rootDir, rootDir, results, options.recursive ?? true);

  return results;
};
