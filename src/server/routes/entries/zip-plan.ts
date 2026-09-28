import path from "node:path";

import { getParentPath } from "#utils/directory-path.ts";

export type ZipSelection =
  | { type: "file"; relativePath: string }
  | { type: "directory"; relativePath: string; nestedFiles: string[] };

export interface ZipEntryPlan {
  relativePath: string;
  archivePath: string;
}

const ROOT_ZIP_BASE_NAME = "assets";
const SELECTION_ZIP_SUFFIX = "-selection";
const FIRST_DUPLICATE_NUMBER = 2;

const withDuplicateSuffix = (name: string, isFile: boolean, duplicateNumber: number): string => {
  const suffix = ` (${duplicateNumber})`;

  if (!isFile) {
    return `${name}${suffix}`;
  }

  const extension = path.posix.extname(name);
  const stem = name.slice(0, name.length - extension.length);

  return `${stem}${suffix}${extension}`;
};

const claimUniqueName = (name: string, isFile: boolean, usedNames: Set<string>): string => {
  let candidate = name;
  let duplicateNumber = FIRST_DUPLICATE_NUMBER;

  while (usedNames.has(candidate)) {
    candidate = withDuplicateSuffix(name, isFile, duplicateNumber);
    duplicateNumber += 1;
  }

  usedNames.add(candidate);

  return candidate;
};

export const planZipEntries = (selections: ZipSelection[]): ZipEntryPlan[] => {
  const usedTopLevelNames = new Set<string>();
  const plan: ZipEntryPlan[] = [];

  for (const selection of selections) {
    const isFile = selection.type === "file";
    const baseName = path.posix.basename(selection.relativePath);
    const topLevelName = claimUniqueName(baseName, isFile, usedTopLevelNames);

    if (selection.type === "file") {
      plan.push({ relativePath: selection.relativePath, archivePath: topLevelName });

      continue;
    }

    for (const nestedFile of selection.nestedFiles) {
      plan.push({
        relativePath: `${selection.relativePath}/${nestedFile}`,
        archivePath: `${topLevelName}/${nestedFile}`,
      });
    }
  }

  return plan;
};

export const buildZipFileName = (relativePaths: string[]): string => {
  const isSingleSelection = relativePaths.length === 1;

  if (isSingleSelection) {
    return `${path.posix.basename(relativePaths[0] ?? "")}.zip`;
  }

  // The suffix keeps a partial selection distinct from downloading the whole containing folder.
  const containingPath = getParentPath(relativePaths[0] ?? "");
  const containingName = containingPath ? path.posix.basename(containingPath) : ROOT_ZIP_BASE_NAME;

  return `${containingName}${SELECTION_ZIP_SUFFIX}.zip`;
};
