import { execFileAsync } from "#server/utils/exec.ts";

export const convertToOgg = async (sourcePath: string, destinationPath: string): Promise<void> => {
  await execFileAsync("ffmpeg", ["-y", "-i", sourcePath, "-c:a", "libvorbis", destinationPath]);
};
