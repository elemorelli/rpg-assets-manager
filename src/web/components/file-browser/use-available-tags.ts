import { useCallback, useEffect, useState } from "react";

import * as api from "#web/requests/index.ts";

export interface UseAvailableTagsResult {
  availableTags: string[];
  refreshTags: () => Promise<void>;
}

export const useAvailableTags = (): UseAvailableTagsResult => {
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const refreshTags = useCallback(async (): Promise<void> => {
    const tags = await api.fetchTags();

    setAvailableTags(tags);
  }, []);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  return { availableTags, refreshTags };
};
