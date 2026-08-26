import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { requestJson } from "../../http-client.ts";

export type DirectoryTree = Record<string, DirectoryEntry[]>;

export const getDirectoryTree = (): Promise<DirectoryTree> =>
  requestJson<DirectoryTree>("/api/directories");
