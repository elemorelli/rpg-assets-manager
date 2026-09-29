import type { OperationScope } from "#utils/operation-scope.ts";

const ROOT_DIRECTORY_LABEL = "root";

export const describeDirectoryLabel = (directoryPath: string): string =>
  directoryPath === "" ? ROOT_DIRECTORY_LABEL : directoryPath;

export const describeScopedTitle = (
  verbPhrase: string,
  scope: OperationScope,
  directoryLabel: string,
): string => {
  if (scope === "all") {
    return `${verbPhrase} across all folders`;
  }

  return `${verbPhrase} in ${describeDirectoryLabel(directoryLabel)}`;
};
