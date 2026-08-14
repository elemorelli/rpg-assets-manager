import { jsonInit, requestJson } from "../http-client.ts";

export const login = (password: string): Promise<void> =>
  requestJson<void>("/api/login", jsonInit("POST", { password }));
