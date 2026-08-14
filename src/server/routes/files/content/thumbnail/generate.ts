import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const THUMBNAIL_MAX_WIDTH_PX = 256;
const THUMBNAIL_QUALITY = 80;
const AUTO_HEIGHT = 0;

export const generateThumbnail = async (
  sourcePath: string,
  destinationPath: string,
): Promise<void> => {
  await execFileAsync("cwebp", [
    "-quiet",
    "-q",
    String(THUMBNAIL_QUALITY),
    "-resize",
    String(THUMBNAIL_MAX_WIDTH_PX),
    String(AUTO_HEIGHT),
    sourcePath,
    "-o",
    destinationPath,
  ]);
};
