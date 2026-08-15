import { requestJson } from "../http-client.ts";

export const fetchTags = (): Promise<string[]> => requestJson<string[]>("/api/tags");
