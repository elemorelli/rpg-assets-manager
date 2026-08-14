import { requestJson } from "../http-client.ts";

export interface SyncRun {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  addedCount: number;
  modifiedCount: number;
  deletedCount: number;
  renamedCount: number;
  outcome: string;
  generatedMacro: string | null;
  worldAcknowledgements: Record<string, boolean>;
}

export const fetchSyncRuns = (): Promise<SyncRun[]> => requestJson<SyncRun[]>("/api/sync-runs");
