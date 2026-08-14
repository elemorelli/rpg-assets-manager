import { parentDirectory } from "../../utils/paths.ts";

export interface DraggedEntry {
  relativePath: string;
  type: "file" | "directory";
}

export const isValidDropTarget = (entry: DraggedEntry, targetDirectoryPath: string): boolean => {
  const sourceParentPath = parentDirectory(entry.relativePath);

  if (targetDirectoryPath === sourceParentPath) {
    return false;
  }

  if (entry.type === "directory") {
    const isDroppingOntoItself = targetDirectoryPath === entry.relativePath;
    const isDroppingOntoOwnDescendant = targetDirectoryPath.startsWith(`${entry.relativePath}/`);

    if (isDroppingOntoItself || isDroppingOntoOwnDescendant) {
      return false;
    }
  }

  return true;
};
