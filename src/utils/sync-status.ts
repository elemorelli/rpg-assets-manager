export interface RemoteIndexRecord {
  hash: string;
  size: number;
}

export interface ComputeDirectorySyncStatusInput {
  relativeDir: string;
  fileNames: string[];
  directoryNames: string[];
  localIndex: Map<string, string>;
  remoteIndex: Map<string, RemoteIndexRecord>;
}

export interface DeletedFileEntry {
  name: string;
  size: number;
}

export interface DirectorySyncStatus {
  pendingFileNames: Set<string>;
  deletedFiles: DeletedFileEntry[];
  pendingDirectoryNames: Set<string>;
}

const buildDirectoryPrefix = (relativeDir: string): string =>
  relativeDir === "" ? "" : `${relativeDir}/`;

const findChangedPaths = (
  localIndex: Map<string, string>,
  remoteIndex: Map<string, RemoteIndexRecord>,
): Set<string> => {
  const allPaths = new Set([...localIndex.keys(), ...remoteIndex.keys()]);
  const changedPaths = new Set<string>();

  for (const candidatePath of allPaths) {
    const localHash = localIndex.get(candidatePath);
    const remoteHash = remoteIndex.get(candidatePath)?.hash;

    if (localHash !== remoteHash) {
      changedPaths.add(candidatePath);
    }
  }

  return changedPaths;
};

const findPendingFileNames = (
  fileNames: string[],
  directoryPrefix: string,
  changedPaths: Set<string>,
  localIndex: Map<string, string>,
): Set<string> => {
  const pendingFileNames = new Set<string>();

  for (const fileName of fileNames) {
    const filePath = `${directoryPrefix}${fileName}`;

    if (localIndex.has(filePath) && changedPaths.has(filePath)) {
      pendingFileNames.add(fileName);
    }
  }

  return pendingFileNames;
};

const findDeletedFiles = (
  fileNames: string[],
  directoryPrefix: string,
  remoteIndex: Map<string, RemoteIndexRecord>,
): DeletedFileEntry[] => {
  const fileNamesOnDisk = new Set(fileNames);
  const deletedFiles: DeletedFileEntry[] = [];

  for (const [remotePath, remoteRecord] of remoteIndex) {
    if (!remotePath.startsWith(directoryPrefix)) {
      continue;
    }

    const remainder = remotePath.slice(directoryPrefix.length);
    const isDirectChildFile = remainder !== "" && !remainder.includes("/");

    if (isDirectChildFile && !fileNamesOnDisk.has(remainder)) {
      deletedFiles.push({ name: remainder, size: remoteRecord.size });
    }
  }

  return deletedFiles;
};

const findPendingDirectoryNames = (
  directoryNames: string[],
  directoryPrefix: string,
  changedPaths: Set<string>,
): Set<string> => {
  const pendingDirectoryNames = new Set<string>();

  for (const directoryName of directoryNames) {
    const descendantPrefix = `${directoryPrefix}${directoryName}/`;
    const hasChangedDescendant = [...changedPaths].some((changedPath) =>
      changedPath.startsWith(descendantPrefix),
    );

    if (hasChangedDescendant) {
      pendingDirectoryNames.add(directoryName);
    }
  }

  return pendingDirectoryNames;
};

export const computeDirectorySyncStatus = ({
  relativeDir,
  fileNames,
  directoryNames,
  localIndex,
  remoteIndex,
}: ComputeDirectorySyncStatusInput): DirectorySyncStatus => {
  const directoryPrefix = buildDirectoryPrefix(relativeDir);
  const changedPaths = findChangedPaths(localIndex, remoteIndex);

  return {
    pendingFileNames: findPendingFileNames(fileNames, directoryPrefix, changedPaths, localIndex),
    deletedFiles: findDeletedFiles(fileNames, directoryPrefix, remoteIndex),
    pendingDirectoryNames: findPendingDirectoryNames(directoryNames, directoryPrefix, changedPaths),
  };
};
