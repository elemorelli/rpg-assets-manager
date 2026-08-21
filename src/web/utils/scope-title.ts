import type { OperationScope } from "#utils/operation-scope.ts";

export const describeScopedTitle = (
  verbPhrase: string,
  scope: OperationScope,
  directoryLabel: string,
): string => {
  if (scope === "all") {
    return `${verbPhrase} across all folders`;
  }

  return `${verbPhrase} in ${directoryLabel === "" ? "root" : directoryLabel}`;
};
