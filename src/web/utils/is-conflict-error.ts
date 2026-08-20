import { ApiError } from "#web/requests/http-client.ts";

const CONFLICT_STATUS = 409;

export const isConflictError = (error: unknown): boolean =>
  error instanceof ApiError && error.statusCode === CONFLICT_STATUS;
