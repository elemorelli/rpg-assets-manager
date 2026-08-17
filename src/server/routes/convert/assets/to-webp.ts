import { execFileAsync } from "#server/utils/exec.ts";

export const convertToWebp = async (sourcePath: string, destinationPath: string): Promise<void> => {
  await execFileAsync("cwebp", ["-mt", "-quiet", sourcePath, "-o", destinationPath]);
};
