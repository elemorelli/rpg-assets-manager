import { joinUrl } from "#server/utils/url.ts";

import { buildMacroTemplate } from "./macro-template.ts";

export interface RenamePair {
  oldPath: string;
  newPath: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildRenameEntries = (renamed: RenamePair[], baseUrl: string): [string, string][] => {
  const entries: [string, string][] = [];

  for (const pair of renamed) {
    const oldUrl = joinUrl(baseUrl, pair.oldPath);
    const newUrl = joinUrl(baseUrl, pair.newPath);
    const encodedOldUrl = encodeURI(oldUrl);

    entries.push([oldUrl, newUrl]);

    if (encodedOldUrl !== oldUrl) {
      entries.push([encodedOldUrl, newUrl]);
    }
  }

  return entries;
};

const buildWorldHeaderLine = (worldNames: string[]): string =>
  worldNames.length > 0
    ? ` * Run once in each of these worlds: ${worldNames.join(", ")}.`
    : " * No worlds configured (set FOUNDRY_WORLD_NAMES). Run once per world manually.";

export const generateMacro = (
  renamed: RenamePair[],
  baseUrl: string,
  worldNames: string[],
): string | null => {
  if (renamed.length === 0) {
    return null;
  }

  const renameMapEntries = buildRenameEntries(renamed, baseUrl)
    .map(([oldUrl, newUrl]) => `  [${JSON.stringify(oldUrl)}, ${JSON.stringify(newUrl)}],`)
    .join("\n");

  const urlPatternSource = `${escapeRegExp(baseUrl)}/[^\\s"'<>)\\\\]+`;

  return buildMacroTemplate({
    worldHeaderLine: buildWorldHeaderLine(worldNames),
    urlPatternSource,
    renameMapEntries,
    totalExpectedRenames: renamed.length,
  });
};
