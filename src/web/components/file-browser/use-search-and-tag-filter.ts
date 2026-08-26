import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";

import { parentDirectory } from "#utils/paths.ts";
import type { SearchResultEntry } from "#web/requests/entries/search.ts";
import * as api from "#web/requests/index.ts";
import { describeErrorAsMessage, type Message } from "#web/utils/message.ts";

export interface UseSearchAndTagFilterParams {
  onNavigate: (path: string) => void;
  onError: (message: Message) => void;
}

export interface UseSearchAndTagFilterResult {
  selectedTags: string[];
  searchResults: SearchResultEntry[] | null;
  tagFilterResults: SearchResultEntry[] | null;
  handleSearch: (nextQuery: string) => void;
  handleToggleTag: (tag: string) => void;
  handleOpenSearchResult: (entry: SearchResultEntry) => void;
}

export const useSearchAndTagFilter = ({
  onNavigate,
  onError,
}: UseSearchAndTagFilterParams): UseSearchAndTagFilterResult => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResultEntry[] | null>(null);
  const [tagFilterResults, setTagFilterResults] = useState<SearchResultEntry[] | null>(null);

  const query = searchParams.get("q") ?? "";
  const tagsParam = searchParams.get("tags") ?? "";
  const selectedTags = tagsParam ? tagsParam.split(",") : [];

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setSearchResults(null);

      return;
    }

    api
      .searchEntries(trimmedQuery)
      .then(setSearchResults)
      .catch((caught: unknown) => onError(describeErrorAsMessage(caught)));
  }, [query, onError]);

  useEffect(() => {
    if (selectedTags.length === 0) {
      setTagFilterResults(null);

      return;
    }

    api
      .fetchFilesByTag(selectedTags)
      .then(setTagFilterResults)
      .catch((caught: unknown) => onError(describeErrorAsMessage(caught)));
    // selectedTags is a fresh array every render; depend on tagsParam instead to avoid refetching on every render.
  }, [tagsParam, onError]);

  const handleSearch = (nextQuery: string): void => {
    const trimmed = nextQuery.trim();

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (trimmed) {
        next.set("q", trimmed);
      } else {
        next.delete("q");
      }

      return next;
    });
  };

  const handleToggleTag = (tag: string): void => {
    const nextSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter((selected) => selected !== tag)
      : [...selectedTags, tag];

    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);

      if (nextSelectedTags.length > 0) {
        next.set("tags", nextSelectedTags.join(","));
      } else {
        next.delete("tags");
      }

      return next;
    });
  };

  const handleOpenSearchResult = (entry: SearchResultEntry): void => {
    const targetDirectory =
      entry.type === "directory" ? entry.relativePath : parentDirectory(entry.relativePath);

    onNavigate(targetDirectory);
  };

  return {
    selectedTags,
    searchResults,
    tagFilterResults,
    handleSearch,
    handleToggleTag,
    handleOpenSearchResult,
  };
};
