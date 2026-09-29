export interface RescanRequest {
  forceRehash?: boolean;
  removeEmptyFolders?: boolean;
}

export interface RescanSummary {
  hashed: number;
  unchanged: number;
  removed: number;
  renamed: number;
  removedFolders: number;
}
