import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { requestJson } from "../http-client.ts";

export const listDirectory = (path: string): Promise<DirectoryEntry[]> =>
  requestJson<DirectoryEntry[]>(`/api/files?path=${encodeURIComponent(path)}`);
