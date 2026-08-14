import { parentDirectory } from "../../../../utils/paths.ts";

export type ConversionKind = "image" | "audio";

export interface ConversionCandidate {
  relativePath: string;
  kind: ConversionKind;
  destinationPath: string;
}

export interface ConversionPlan {
  candidates: ConversionCandidate[];
  conflicts: ConversionCandidate[];
}

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
      .map((file) => parentDirectory(file.relativePath)),
  );

  const sortedFiles = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  const candidates: ConversionCandidate[] = [];
  const conflicts: ConversionCandidate[] = [];

  for (const file of sortedFiles) {
    const extension = extensionOf(file.relativePath);
    const kind = kindForExtension(extension);

    if (!kind) {
      continue;
    }

    if (skippedDirectories.has(parentDirectory(file.relativePath))) {
      continue;
    }

    const destinationPath = withReplacedExtension(
      file.relativePath,
      extension,
      DESTINATION_EXTENSION[kind],
    );
    const candidate: ConversionCandidate = {
      relativePath: file.relativePath,
      kind,
      destinationPath,
    };

    if (existingPaths.has(destinationPath)) {
      conflicts.push(candidate);

      continue;
    }

    candidates.push(candidate);
  }

  return { candidates, conflicts };
};
