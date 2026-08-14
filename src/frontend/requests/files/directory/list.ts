import type { DirectoryEntry } from "#utils/directoryListing.ts";
import { requestJson } from "../../httpClient.ts";

export const listDirectory = (path: string): Promise<DirectoryEntry[]> =>
  requestJson<DirectoryEntry[]>(`/api/files?path=${encodeURIComponent(path)}`);
