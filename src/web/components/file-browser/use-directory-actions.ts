import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";

export interface UseDirectoryActionsParams {
  currentPath: string;
  runAction: (action: () => Promise<void>) => void;
  refreshTags: () => Promise<void>;
}

export interface UseDirectoryActionsResult {
  handleCreateDirectory: (name: string) => void;
  handleRescan: (forceRehash: boolean) => void;
  handleRename: (entry: DirectoryEntry, newName: string) => void;
  handleDelete: (entry: DirectoryEntry) => void;
  handleTreeRename: (path: string, newName: string) => void;
  handleTreeDelete: (path: string) => void;
  handleTreeTagsChange: (path: string, tags: string[]) => void;
  handleTagsChange: (entry: DirectoryEntry, tags: string[]) => void;
}

export const useDirectoryActions = ({
  currentPath,
  runAction,
  refreshTags,
}: UseDirectoryActionsParams): UseDirectoryActionsResult => {
  const handleCreateDirectory = (name: string): void => {
    runAction(() => api.createDirectory(joinRelativePath(currentPath, name)));
  };

  const handleRescan = (forceRehash: boolean): void => {
    runAction(() => api.rescan(forceRehash).then(() => undefined));
  };

  const handleRename = (entry: DirectoryEntry, newName: string): void => {
    runAction(() => api.renameEntry(joinRelativePath(currentPath, entry.name), newName));
  };

  const handleDelete = (entry: DirectoryEntry): void => {
    runAction(() => api.deleteEntry(joinRelativePath(currentPath, entry.name)));
  };

  const handleTreeRename = (path: string, newName: string): void => {
    runAction(() => api.renameEntry(path, newName));
  };

  const handleTreeDelete = (path: string): void => {
    runAction(() => api.deleteEntry(path));
  };

  const handleTreeTagsChange = (path: string, tags: string[]): void => {
    runAction(() => api.setAssetTags(path, tags).then(() => refreshTags()));
  };

  const handleTagsChange = (entry: DirectoryEntry, tags: string[]): void => {
    const entryPath = joinRelativePath(currentPath, entry.name);

    runAction(() => api.setAssetTags(entryPath, tags).then(() => refreshTags()));
  };

  return {
    handleCreateDirectory,
    handleRescan,
    handleRename,
    handleDelete,
    handleTreeRename,
    handleTreeDelete,
    handleTreeTagsChange,
    handleTagsChange,
  };
};
