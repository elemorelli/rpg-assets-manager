import { requestJson } from "../../http-client.ts";

export const uploadFile = async (targetDirPath: string, file: File): Promise<void> => {
  const form = new FormData();
  form.set("path", targetDirPath);
  form.set("file", file);

  await requestJson("/api/files/upload", { method: "POST", body: form });
};
