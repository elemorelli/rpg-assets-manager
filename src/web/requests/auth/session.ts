import { ApiError, requestJson } from "../http-client.ts";

const UNAUTHORIZED_STATUS = 401;

export const checkSession = async (): Promise<boolean> => {
  try {
    await requestJson<void>("/api/session");

    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === UNAUTHORIZED_STATUS) {
      return false;
    }

    throw error;
  }
};
