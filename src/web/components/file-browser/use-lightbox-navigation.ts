import { useState } from "react";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

export interface UseLightboxNavigationParams {
  previewableEntries: DirectoryEntry[];
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

export const useLightboxNavigation = ({
  previewableEntries,
  onRename,
  onDelete,
}: UseLightboxNavigationParams): UseLightboxNavigationResult => {
  const [lightboxEntryName, setLightboxEntryName] = useState<string | null>(null);

  const lightboxIndex =
    lightboxEntryName === null
      ? -1
      : previewableEntries.findIndex((entry) => entry.name === lightboxEntryName);
  const lightboxEntry = lightboxIndex === -1 ? null : previewableEntries[lightboxIndex];

  const handleOpenLightbox = (entry: DirectoryEntry): void => {
    setLightboxEntryName(entry.name);
  };

  const handleCloseLightbox = (): void => {
    setLightboxEntryName(null);
  };

  const handleLightboxPrev = (): void => {
    if (lightboxIndex > 0) {
      setLightboxEntryName(previewableEntries[lightboxIndex - 1].name);
    }
  };

  const handleLightboxNext = (): void => {
    if (lightboxIndex !== -1 && lightboxIndex < previewableEntries.length - 1) {
      setLightboxEntryName(previewableEntries[lightboxIndex + 1].name);
    }
  };

  const handleLightboxRename = (entry: DirectoryEntry, newName: string): void => {
    onRename(entry, newName);
    setLightboxEntryName(newName);
  };

  const handleLightboxDelete = (entry: DirectoryEntry): void => {
    const fallbackEntry =
      previewableEntries[lightboxIndex + 1] ?? previewableEntries[lightboxIndex - 1];

    onDelete(entry);
    setLightboxEntryName(fallbackEntry?.name ?? null);
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
