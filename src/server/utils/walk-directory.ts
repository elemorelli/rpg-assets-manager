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

// Recurses breadth-first-ish via Promise.all over each directory's
// subdirectories, rather than awaiting one subtree at a time. `fs.readdir`
// runs on libuv's threadpool, so a fully serial walk (the previous
// implementation) could only ever have one readdir in flight, which made
// this scale with the *total number of directories* in the tree instead of
// its depth, on disks where each syscall has real per-call latency.
const collectEntries = async (
  rootDir: string,
  currentDir: string,
  recursive: boolean,
): Promise<WalkedEntry[]> => {
  const dirents = await fs.readdir(currentDir, { withFileTypes: true });
  const entries: WalkedEntry[] = [];
  const subdirectoryWalks: Promise<WalkedEntry[]>[] = [];

  for (const dirent of dirents) {
    const entryPath = path.join(currentDir, dirent.name);
    const relativePath = path.relative(rootDir, entryPath).split(path.sep).join("/");

    entries.push({ relativePath, entryPath, dirent });

    if (dirent.isDirectory() && recursive) {
      subdirectoryWalks.push(collectEntries(rootDir, entryPath, recursive));
    }
  }

  const subdirectoryEntries = await Promise.all(subdirectoryWalks);

  for (const nestedEntries of subdirectoryEntries) {
    entries.push(...nestedEntries);
  }

  return entries;
};

export const walkDirectory = async (
  rootDir: string,
  options: WalkDirectoryOptions = {},
): Promise<WalkedEntry[]> => await collectEntries(rootDir, rootDir, options.recursive ?? true);
