import { requestJson } from "../../http-client.ts";

export const uploadFile = async (
  targetDirPath: string,
  file: File,
  overwrite = false,
): Promise<void> => {
  const form = new FormData();
  form.set("path", targetDirPath);
  form.set("file", file);
  form.set("overwrite", String(overwrite));

  await requestJson("/api/files/upload", { method: "POST", body: form });
};
