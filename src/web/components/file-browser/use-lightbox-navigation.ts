import type { DirectoryEntry } from "#utils/directory-listing.ts";
import { joinRelativePath } from "#utils/paths.ts";

export interface UseLightboxNavigationParams {
  directoryPath: string;
  deepLinkedFileName: string | null;
  previewableEntries: DirectoryEntry[];
  navigateToPath: (path: string) => void;
  onRename: (entry: DirectoryEntry, newName: string) => void;
  onDelete: (entry: DirectoryEntry) => void;
}

export interface UseLightboxNavigationResult {
  lightboxEntry: DirectoryEntry | null;
  lightboxIndex: number;
  handleOpenLightbox: (entry: DirectoryEntry) => void;
  handleCloseLightbox: () => void;
  handleLightboxPrev: () => void;
  handleLightboxNext: () => void;
  handleLightboxRename: (entry: DirectoryEntry, newName: string) => void;
  handleLightboxDelete: (entry: DirectoryEntry) => void;
}

// The URL is the single source of truth for "which file is open": the
// lightbox entry is derived fresh every render from deepLinkedFileName
// (parsed from the route) instead of being tracked as separate React state
// that then needs to be kept in sync with the address bar.
export const useLightboxNavigation = ({
  directoryPath,
  deepLinkedFileName,
  previewableEntries,
  navigateToPath,
  onRename,
  onDelete,
}: UseLightboxNavigationParams): UseLightboxNavigationResult => {
  const lightboxIndex =
    deepLinkedFileName === null
      ? -1
      : previewableEntries.findIndex((entry) => entry.name === deepLinkedFileName);
  const lightboxEntry = lightboxIndex === -1 ? null : previewableEntries[lightboxIndex];

  const navigateToEntry = (entry: DirectoryEntry): void => {
    navigateToPath(joinRelativePath(directoryPath, entry.name));
  };

  const handleOpenLightbox = (entry: DirectoryEntry): void => {
    navigateToEntry(entry);
  };

  const handleCloseLightbox = (): void => {
    navigateToPath(directoryPath);
  };

  const handleLightboxPrev = (): void => {
    if (lightboxIndex > 0) {
      navigateToEntry(previewableEntries[lightboxIndex - 1]);
    }
  };

  const handleLightboxNext = (): void => {
    if (lightboxIndex !== -1 && lightboxIndex < previewableEntries.length - 1) {
      navigateToEntry(previewableEntries[lightboxIndex + 1]);
    }
  };

  const handleLightboxRename = (entry: DirectoryEntry, newName: string): void => {
    onRename(entry, newName);
    navigateToPath(joinRelativePath(directoryPath, newName));
  };

  const handleLightboxDelete = (entry: DirectoryEntry): void => {
    const fallbackEntry =
      previewableEntries[lightboxIndex + 1] ?? previewableEntries[lightboxIndex - 1];

    onDelete(entry);

    if (fallbackEntry) {
      navigateToEntry(fallbackEntry);
    } else {
      navigateToPath(directoryPath);
    }
  };

  return {
    lightboxEntry,
    lightboxIndex,
    handleOpenLightbox,
    handleCloseLightbox,
    handleLightboxPrev,
    handleLightboxNext,
    handleLightboxRename,
    handleLightboxDelete,
  };
};
