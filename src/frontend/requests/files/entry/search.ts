import { requestJson } from "../../httpClient.ts";

export interface SearchResultEntry {
  relativePath: string;
  type: "file" | "directory";
}

export const searchEntries = (query: string): Promise<SearchResultEntry[]> =>
  requestJson<SearchResultEntry[]>(`/api/files/search?q=${encodeURIComponent(query)}`);
