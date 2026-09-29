import { requestJson } from "../../http-client.ts";

export const uploadFile = async (
  targetDirPath: string,
  file: File,
  overwrite = false,
): Promise<void> => {
  // @fastify/multipart only sees fields sent before the file part, so path and overwrite go first.
  const form = new FormData();
  form.set("path", targetDirPath);
  form.set("overwrite", String(overwrite));
  form.set("file", file);

  await requestJson("/api/files/upload", { method: "POST", body: form });
};
