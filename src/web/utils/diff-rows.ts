import type { ConversionCandidate } from "#web/requests/convert/plan/conversion.ts";
import type { BatchDiff } from "#web/requests/diff/fetch.ts";
import type { RcloneCheckResult } from "#web/requests/reconcile/check.ts";

export type DiffRowKind = "added" | "removed" | "modified" | "renamed";

export interface DiffRow {
  key: string;
  kind: DiffRowKind;
  before?: string;
  after?: string;
  overwrite?: boolean;
}

export const buildSyncDiffRows = (diff: BatchDiff): DiffRow[] => [
  ...diff.added.map((relativePath) => ({
    key: `added:${relativePath}`,
    kind: "added" as const,
    after: relativePath,
  })),
  ...diff.modified.map((relativePath) => ({
    key: `modified:${relativePath}`,
    kind: "modified" as const,
    before: relativePath,
    after: relativePath,
  })),
  ...diff.deleted.map((relativePath) => ({
    key: `deleted:${relativePath}`,
    kind: "removed" as const,
    before: relativePath,
  })),
  ...diff.renamed.map((pair) => ({
    key: `renamed:${pair.oldPath}`,
    kind: "renamed" as const,
    before: pair.oldPath,
    after: pair.newPath,
  })),
];

export const buildConversionDiffRows = (candidates: ConversionCandidate[]): DiffRow[] =>
  candidates.map((candidate) => ({
    key: candidate.relativePath,
    kind: "renamed" as const,
    before: candidate.relativePath,
    after: candidate.destinationPath,
    overwrite: candidate.willOverwrite,
  }));

export const buildReconcileDiffRows = (result: RcloneCheckResult): DiffRow[] => [
  ...result.missingOnDestination.map((relativePath) => ({
    key: `missing-destination:${relativePath}`,
    kind: "removed" as const,
    before: relativePath,
  })),
  ...result.missingOnSource.map((relativePath) => ({
    key: `missing-source:${relativePath}`,
    kind: "added" as const,
    after: relativePath,
  })),
  ...result.differs.map((relativePath) => ({
    key: `differs:${relativePath}`,
    kind: "modified" as const,
    before: relativePath,
    after: relativePath,
  })),
];
