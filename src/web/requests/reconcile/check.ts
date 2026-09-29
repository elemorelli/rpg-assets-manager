import type { RcloneCheckResult } from "#utils/reconcile.ts";

import { requestJson } from "../http-client.ts";

export const reconcile = (): Promise<RcloneCheckResult> =>
  requestJson<RcloneCheckResult>("/api/reconcile", { method: "POST" });
