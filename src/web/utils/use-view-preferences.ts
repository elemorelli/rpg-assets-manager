import { useEffect, useState } from "react";

import type { GroupCriterion } from "./entry-grouping.ts";
import type { SortCriterion, SortDirection } from "./sort-entries.ts";

export type ViewMode = "table" | "grid";

export interface ViewPreferences {
  viewMode: ViewMode;
  sortCriterion: SortCriterion;
  sortDirection: SortDirection;
  groupCriterion: GroupCriterion;
}

export interface UseViewPreferencesResult extends ViewPreferences {
  setViewMode: (mode: ViewMode) => void;
  setSortCriterion: (criterion: SortCriterion) => void;
  setSortDirection: (direction: SortDirection) => void;
  setGroupCriterion: (criterion: GroupCriterion) => void;
}

const DEFAULT_PREFERENCES: ViewPreferences = {
  viewMode: "table",
  sortCriterion: "name",
  sortDirection: "asc",
  groupCriterion: "none",
};

const storageKeyForPath = (path: string): string => `viewPreferences:${path}`;

const readStoredPreferences = (path: string): ViewPreferences => {
  const stored = window.localStorage.getItem(storageKeyForPath(path));

  if (!stored) {
    return DEFAULT_PREFERENCES;
  }

  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

export const useViewPreferences = (currentPath: string): UseViewPreferencesResult => {
  const [preferences, setPreferences] = useState<ViewPreferences>(() =>
    readStoredPreferences(currentPath),
  );

  useEffect(() => {
    setPreferences(readStoredPreferences(currentPath));
  }, [currentPath]);

  const updatePreferences = (partial: Partial<ViewPreferences>): void => {
    setPreferences((current) => {
      const next = { ...current, ...partial };

      window.localStorage.setItem(storageKeyForPath(currentPath), JSON.stringify(next));

      return next;
    });
  };

  return {
    ...preferences,
    setViewMode: (viewMode) => updatePreferences({ viewMode }),
    setSortCriterion: (sortCriterion) => updatePreferences({ sortCriterion }),
    setSortDirection: (sortDirection) => updatePreferences({ sortDirection }),
    setGroupCriterion: (groupCriterion) => updatePreferences({ groupCriterion }),
  };
};
