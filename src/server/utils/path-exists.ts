import fs from "node:fs/promises";

export const pathExists = (filePath: string): Promise<boolean> =>
  fs
    .access(filePath)
    .then(() => true)
    .catch(() => false);
