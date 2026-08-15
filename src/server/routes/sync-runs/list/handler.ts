import { db } from "#server/db/index.ts";
import { listSyncRuns } from "./list-sync-runs.ts";

export const listSyncRunsHandler = async () => listSyncRuns(db);
