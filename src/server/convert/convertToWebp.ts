import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const convertToWebp = async (sourcePath: string, destinationPath: string): Promise<void> => {
  await execFileAsync("cwebp", ["-mt", "-quiet", sourcePath, "-o", destinationPath]);
};
