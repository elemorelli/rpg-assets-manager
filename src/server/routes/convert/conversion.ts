import type { ConversionCandidate, ConversionKind, ConversionPlan } from "#utils/conversion.ts";
import { getParentPath } from "#utils/directory-path.ts";

const IMAGE_SOURCE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const AUDIO_SOURCE_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".aif", ".aiff", ".m4a"]);
const SKIP_FILE_NAME = ".skip";

const DESTINATION_EXTENSION: Record<ConversionKind, string> = {
  image: ".webp",
  audio: ".ogg",
};

const extensionOf = (relativePath: string): string => {
  const baseName = relativePath.split("/").at(-1) ?? "";
  const dotIndex = baseName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return baseName.slice(dotIndex).toLowerCase();
};

const kindForExtension = (extension: string): ConversionKind | undefined => {
  if (IMAGE_SOURCE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (AUDIO_SOURCE_EXTENSIONS.has(extension)) {
    return "audio";
  }

  return undefined;
};

const withReplacedExtension = (
  relativePath: string,
  extension: string,
  newExtension: string,
): string => `${relativePath.slice(0, relativePath.length - extension.length)}${newExtension}`;

export const computeConversionPlan = (files: { relativePath: string }[]): ConversionPlan => {
  const existingPaths = new Set(files.map((file) => file.relativePath));

  const skippedDirectories = new Set(
    files
      .filter((file) => file.relativePath.split("/").at(-1) === SKIP_FILE_NAME)
      .map((file) => getParentPath(file.relativePath)),
  );

  const sortedFiles = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const candidates: ConversionCandidate[] = [];

  for (const file of sortedFiles) {
    const extension = extensionOf(file.relativePath);
    const kind = kindForExtension(extension);

    if (!kind) {
      continue;
    }

    if (skippedDirectories.has(getParentPath(file.relativePath))) {
      continue;
    }

    const destinationPath = withReplacedExtension(
      file.relativePath,
      extension,
      DESTINATION_EXTENSION[kind],
    );

    candidates.push({
      relativePath: file.relativePath,
      kind,
      destinationPath,
      willOverwrite: existingPaths.has(destinationPath),
    });
  }

  return { candidates };
};
