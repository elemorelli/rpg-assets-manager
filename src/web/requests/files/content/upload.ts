import { requestJson } from "../../http-client.ts";

export const uploadFile = async (
  targetDirPath: string,
  file: File,
  overwrite = false,
): Promise<void> => {
  // @fastify/multipart only has non-file fields available once it reaches the
  // file part, so path/overwrite must be appended before file or the server
  // reads them as unset.
  const form = new FormData();
  form.set("path", targetDirPath);
  form.set("overwrite", String(overwrite));
  form.set("file", file);

  await requestJson("/api/files/upload", { method: "POST", body: form });
};
