export interface DirectoryEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  mtimeMs?: number;
  tags?: string[];
  syncStatus?: "pending" | "new" | "renamed" | "deleted";
  hasPendingSync?: boolean;
}

export interface EntrySyncFlags {
  isDeleted: boolean;
  isNew: boolean;
  isRenamed: boolean;
  isPending: boolean;
}

export const getEntrySyncFlags = (entry: DirectoryEntry): EntrySyncFlags => ({
  isDeleted: entry.syncStatus === "deleted",
  isNew: entry.syncStatus === "new",
  isRenamed: entry.syncStatus === "renamed",
  isPending: entry.syncStatus === "pending" || entry.hasPendingSync === true,
});

const byNameCaseInsensitive = (a: DirectoryEntry, b: DirectoryEntry): number =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

export const sortDirectoryEntries = (entries: DirectoryEntry[]): DirectoryEntry[] => {
  const directories = entries.filter((entry) => entry.type === "directory");
  const files = entries.filter((entry) => entry.type === "file");

  return [...directories.sort(byNameCaseInsensitive), ...files.sort(byNameCaseInsensitive)];
};
