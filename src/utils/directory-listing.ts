export interface DirectoryEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  mtimeMs?: number;
  tags?: string[];
  syncStatus?: "pending" | "deleted";
  hasPendingSync?: boolean;
}

const byNameCaseInsensitive = (a: DirectoryEntry, b: DirectoryEntry): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export const sortDirectoryEntries = (entries: DirectoryEntry[]): DirectoryEntry[] => {
  const directories = entries.filter((entry) => entry.type === "directory");
  const files = entries.filter((entry) => entry.type === "file");

  return [...directories.sort(byNameCaseInsensitive), ...files.sort(byNameCaseInsensitive)];
};
