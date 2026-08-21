export interface RemoteIndexRecord {
  hash: string;
  size: number;
}

export interface LocalIndexRecord {
  hash: string;
  // Set when the file was converted to a new format: the hash it had before
  // conversion, so it can still be matched against its old remote entry.
  previousHash?: string;
}

export interface ComputeDirectorySyncStatusInput {
  relativeDir: string;
  fileNames: string[];
  directoryNames: string[];
  localIndex: Map<string, LocalIndexRecord>;
  remoteIndex: Map<string, RemoteIndexRecord>;
}

export interface DeletedFileEntry {
  name: string;
  size: number;
}

export interface DirectorySyncStatus {
  pendingFileNames: Set<string>;
  newFileNames: Set<string>;
  renamedFileNames: Set<string>;
  deletedFiles: DeletedFileEntry[];
  pendingDirectoryNames: Set<string>;
}

interface RenameMatches {
  renamedLocalPaths: Set<string>;
  consumedRemotePaths: Set<string>;
}

const buildDirectoryPrefix = (relativeDir: string): string =>
  relativeDir === "" ? "" : `${relativeDir}/`;

const findChangedPaths = (
  localIndex: Map<string, LocalIndexRecord>,
  remoteIndex: Map<string, RemoteIndexRecord>,
): Set<string> => {
  const allPaths = new Set([...localIndex.keys(), ...remoteIndex.keys()]);
  const changedPaths = new Set<string>();

  for (const candidatePath of allPaths) {
    const localHash = localIndex.get(candidatePath)?.hash;
    const remoteHash = remoteIndex.get(candidatePath)?.hash;

    if (localHash !== remoteHash) {
      changedPaths.add(candidatePath);
    }
  }

  return changedPaths;
};

const findRenameMatches = (
  changedPaths: Set<string>,
  localIndex: Map<string, LocalIndexRecord>,
  remoteIndex: Map<string, RemoteIndexRecord>,
): RenameMatches => {
  const localOnlyPaths = [...changedPaths]
    .filter((path) => localIndex.has(path) && !remoteIndex.has(path))
    .sort();
  const remoteOnlyPaths = [...changedPaths]
    .filter((path) => remoteIndex.has(path) && !localIndex.has(path))
    .sort();

  const availableRemotePathsByHash = new Map<string, string[]>();

  for (const remotePath of remoteOnlyPaths) {
    const remoteHash = remoteIndex.get(remotePath)?.hash;

    if (remoteHash === undefined) {
      continue;
    }

    const bucket = availableRemotePathsByHash.get(remoteHash) ?? [];
    bucket.push(remotePath);
    availableRemotePathsByHash.set(remoteHash, bucket);
  }

  const renamedLocalPaths = new Set<string>();
  const consumedRemotePaths = new Set<string>();

  for (const localPath of localOnlyPaths) {
    const localRecord = localIndex.get(localPath);
    const matchHash = localRecord?.previousHash ?? localRecord?.hash;
    const availableMatches =
      matchHash === undefined ? undefined : availableRemotePathsByHash.get(matchHash);
    const matchedRemotePath = availableMatches?.shift();

    if (matchedRemotePath !== undefined) {
      renamedLocalPaths.add(localPath);
      consumedRemotePaths.add(matchedRemotePath);
    }
  }

  return { renamedLocalPaths, consumedRemotePaths };
};

const findFileSyncStatuses = (
  fileNames: string[],
  directoryPrefix: string,
  localIndex: Map<string, LocalIndexRecord>,
  remoteIndex: Map<string, RemoteIndexRecord>,
  renamedLocalPaths: Set<string>,
): { pendingFileNames: Set<string>; newFileNames: Set<string>; renamedFileNames: Set<string> } => {
  const pendingFileNames = new Set<string>();
  const newFileNames = new Set<string>();
  const renamedFileNames = new Set<string>();

  for (const fileName of fileNames) {
    const filePath = `${directoryPrefix}${fileName}`;
    const localRecord = localIndex.get(filePath);

    if (localRecord === undefined) {
      continue;
    }

    const remoteRecord = remoteIndex.get(filePath);

    if (remoteRecord === undefined) {
      if (renamedLocalPaths.has(filePath)) {
        renamedFileNames.add(fileName);
      } else {
        newFileNames.add(fileName);
      }

      continue;
    }

    if (remoteRecord.hash !== localRecord.hash) {
      pendingFileNames.add(fileName);
    }
  }

  return { pendingFileNames, newFileNames, renamedFileNames };
};

const findDeletedFiles = (
  fileNames: string[],
  directoryPrefix: string,
  remoteIndex: Map<string, RemoteIndexRecord>,
  consumedRemotePaths: Set<string>,
): DeletedFileEntry[] => {
  const fileNamesOnDisk = new Set(fileNames);
  const deletedFiles: DeletedFileEntry[] = [];

  for (const [remotePath, remoteRecord] of remoteIndex) {
    if (!remotePath.startsWith(directoryPrefix) || consumedRemotePaths.has(remotePath)) {
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
  const { renamedLocalPaths, consumedRemotePaths } = findRenameMatches(
    changedPaths,
    localIndex,
    remoteIndex,
  );
  const { pendingFileNames, newFileNames, renamedFileNames } = findFileSyncStatuses(
    fileNames,
    directoryPrefix,
    localIndex,
    remoteIndex,
    renamedLocalPaths,
  );

  return {
    pendingFileNames,
    newFileNames,
    renamedFileNames,
    deletedFiles: findDeletedFiles(fileNames, directoryPrefix, remoteIndex, consumedRemotePaths),
    pendingDirectoryNames: findPendingDirectoryNames(directoryNames, directoryPrefix, changedPaths),
  };
};
