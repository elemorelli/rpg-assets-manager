import { toDirectoryPrefix } from "./paths.ts";

export type OperationScope = "folder" | "subtree" | "all";

export const pathMatchesScope = (
  path: string,
  scope: OperationScope,
  relativeDir: string,
): boolean => {
  if (scope === "all") {
    return true;
  }

  const prefix = toDirectoryPrefix(relativeDir);

  if (!path.startsWith(prefix)) {
    return false;
  }

  if (scope === "subtree") {
    return true;
  }

  const remainder = path.slice(prefix.length);

  return remainder !== "" && !remainder.includes("/");
};
