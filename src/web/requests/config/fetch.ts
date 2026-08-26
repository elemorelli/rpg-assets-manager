import type { PublicAppConfig } from "#utils/app-config.ts";

import { requestJson } from "../http-client.ts";

export const fetchAppConfig = (): Promise<PublicAppConfig> =>
  requestJson<PublicAppConfig>("/api/config");
