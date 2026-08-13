import type { DirectoryEntry } from "../core/directoryListing.ts";

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface ErrorBody {
  error?: string;
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const body = (await response.json().catch(() => undefined)) as ErrorBody | undefined;

  return body?.error ?? response.statusText;
};

const requestJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new ApiError(await parseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
};

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const listDirectory = (path: string): Promise<DirectoryEntry[]> =>
  requestJson<DirectoryEntry[]>(`/api/files?path=${encodeURIComponent(path)}`);

export const createDirectory = async (path: string): Promise<void> => {
  await requestJson("/api/files/mkdir", jsonInit("POST", { path }));
};

export const deleteEntry = async (path: string): Promise<void> => {
  await requestJson("/api/files", jsonInit("DELETE", { path }));
};

export const renameEntry = async (path: string, newName: string): Promise<void> => {
  await requestJson("/api/files/rename", jsonInit("POST", { path, newName }));
};

export const moveEntry = async (fromPath: string, toPath: string): Promise<void> => {
  await requestJson("/api/files/move", jsonInit("POST", { fromPath, toPath }));
};

export const uploadFile = async (targetDirPath: string, file: File): Promise<void> => {
  const form = new FormData();
  form.set("path", targetDirPath);
  form.set("file", file);

  await requestJson("/api/files/upload", { method: "POST", body: form });
};
