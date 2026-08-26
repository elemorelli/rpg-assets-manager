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

// Iterative BFS, not recursive: a recursive Promise.all version of this
// crashed in production with "Maximum call stack size exceeded" on the real
// asset tree.
export const walkDirectory = async (
  rootDir: string,
  options: WalkDirectoryOptions = {},
): Promise<WalkedEntry[]> => {
  const recursive = options.recursive ?? true;
  const entries: WalkedEntry[] = [];
  let directoriesAtCurrentDepth = [rootDir];

  while (directoriesAtCurrentDepth.length > 0) {
    const readResults = await Promise.all(
      directoriesAtCurrentDepth.map(async (currentDir) => ({
        currentDir,
        dirents: await fs.readdir(currentDir, { withFileTypes: true }),
      })),
    );

    const directoriesAtNextDepth: string[] = [];

    for (const { currentDir, dirents } of readResults) {
      for (const dirent of dirents) {
        const entryPath = path.join(currentDir, dirent.name);
        const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

        entries.push({ relativePath, entryPath, dirent });

        if (dirent.isDirectory() && recursive) {
          directoriesAtNextDepth.push(entryPath);
        }
      }
    }

    directoriesAtCurrentDepth = directoriesAtNextDepth;
  }

  return entries;
};
