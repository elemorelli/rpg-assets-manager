export interface RenamePair {
  oldPath: string;
  newPath: string;
}

export interface AmbiguousRenameWarning {
  hash: string;
  localPaths: string[];
  remotePaths: string[];
}

export interface BatchDiff {
  added: string[];
  deleted: string[];
  modified: string[];
  renamed: RenamePair[];
  ambiguousWarnings: AmbiguousRenameWarning[];
}
