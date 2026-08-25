import { requestJson } from "../http-client.ts";

export interface CancelJobResult {
  cancelled: boolean;
}

export const cancelJob = (): Promise<CancelJobResult> =>
  requestJson<CancelJobResult>("/api/jobs/cancel", { method: "POST" });
