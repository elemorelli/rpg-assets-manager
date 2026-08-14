import { requestJson } from "../http-client.ts";

export const logout = (): Promise<void> => requestJson<void>("/api/logout", { method: "POST" });
