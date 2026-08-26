import type { SearchResultEntry } from "../entries/search.ts";
import { requestJson } from "../http-client.ts";

export const fetchFilesByTag = (tags: string[]): Promise<SearchResultEntry[]> => {
  const params = new URLSearchParams();

  for (const tag of tags) {
    params.append("tag", tag);
  }

  return requestJson<SearchResultEntry[]>(`/api/files/by-tag?${params.toString()}`);
};
