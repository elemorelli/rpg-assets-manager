import type { DirectoryTree } from "#utils/directory-listing.ts";

import { requestJson } from "../http-client.ts";

export const getDirectoryTree = (): Promise<DirectoryTree> =>
  requestJson<DirectoryTree>("/api/directories");
