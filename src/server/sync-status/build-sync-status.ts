import type { BatchDiff } from "#utils/diff.ts";

export interface SyncStatus {
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  lastSyncAt: string | null;
}

export const buildSyncStatus = (diff: BatchDiff, lastSyncAt: Date | null): SyncStatus => {
  const lastSyncIso = lastSyncAt === null ? null : lastSyncAt.toISOString();

  return {
    added: diff.added.length,
    modified: diff.modified.length,
    deleted: diff.deleted.length,
    renamed: diff.renamed.length,
    lastSyncAt: lastSyncIso,
  };
};
