import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import type { Message } from "#web/utils/message.ts";
import { runBatchOperation } from "#web/utils/run-batch-operation.ts";

const describeEntry = (entry: DirectoryEntry): string => entry.name;

export interface UseMassEntryActionsParams {
  currentPath: string;
  setBusy: (busy: boolean) => void;
  setMessage: (message: Message | null) => void;
  refreshDirectory: (path: string) => Promise<void>;
  refreshTags: () => Promise<void>;
}

export interface UseMassEntryActionsResult {
  handleDeleteMany: (entries: DirectoryEntry[]) => void;
  handleAddTagToMany: (entries: DirectoryEntry[], tag: string) => void;
}

export const useMassEntryActions = ({
  currentPath,
  setBusy,
  setMessage,
  refreshDirectory,
  refreshTags,
}: UseMassEntryActionsParams): UseMassEntryActionsResult => {
  const runBatch = async (
    entries: DirectoryEntry[],
    verb: string,
    action: (entry: DirectoryEntry) => Promise<void>,
  ): Promise<void> => {
    const { errorMessage } = await runBatchOperation(entries, action, describeEntry, verb);

    // refreshDirectory clears the message on entry, so refresh before surfacing the error or the refresh wipes it.
    await refreshDirectory(currentPath);

    if (errorMessage) {
      setMessage({ severity: "error", summary: errorMessage });
    }
  };

  const handleDeleteMany = (entries: DirectoryEntry[]): void => {
    setBusy(true);
    setMessage(null);

    void runBatch(entries, "Deleted", (entry) =>
      api.deleteEntry(joinRelativePath(currentPath, entry.name)),
    );
  };

  const handleAddTagToMany = (entries: DirectoryEntry[], tag: string): void => {
    setBusy(true);
    setMessage(null);

    void runBatch(entries, "Tagged", (entry) => {
      const nextTags = entry.tags?.includes(tag) ? entry.tags : [...(entry.tags ?? []), tag];

      return api
        .setAssetTags(joinRelativePath(currentPath, entry.name), nextTags)
        .then(() => undefined);
    }).then(() => refreshTags());
  };

  return { handleDeleteMany, handleAddTagToMany };
};
