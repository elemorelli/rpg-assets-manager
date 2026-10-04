import { getSyncStatus } from "#server/sync-status/index.ts";

export const statusHandler = async () => getSyncStatus();
