import { describeError } from "#web/utils/describe-error.ts";

export type MessageSeverity = "info" | "warning" | "error";

export interface Message {
  severity: MessageSeverity;
  summary: string;
  details?: string[];
}

export const describeErrorAsMessage = (caught: unknown): Message => ({
  severity: "error",
  summary: describeError(caught),
});
