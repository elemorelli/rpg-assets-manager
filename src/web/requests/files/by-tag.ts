import { requestJson } from "../http-client.ts";
import type { SearchResultEntry } from "./entry/search.ts";

export const fetchFilesByTag = (tags: string[]): Promise<SearchResultEntry[]> => {
  const params = new URLSearchParams();

  for (const tag of tags) {
    params.append("tag", tag);
  }

  return requestJson<SearchResultEntry[]>(`/api/files/by-tag?${params.toString()}`);
};
