import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";
import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";
import type { Message } from "#web/utils/message.ts";

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
    let successCount = 0;
    let resultMessage: Message | null = null;

    for (const entry of entries) {
      try {
        await action(entry);
        successCount += 1;
      } catch (error) {
        resultMessage = {
          severity: "error",
          summary: `${verb} ${successCount} of ${entries.length} before failing on "${entry.name}": ${describeError(error)}`,
        };
        break;
      }
    }

    // refreshDirectory clears the message on entry, so refresh before surfacing resultMessage or the refresh wipes it.
    await refreshDirectory(currentPath);

    if (resultMessage) {
      setMessage(resultMessage);
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
