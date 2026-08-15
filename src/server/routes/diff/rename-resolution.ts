export interface OrphanCandidate {
  path: string;
  hash: string;
}

interface HashGroup {
  hash: string;
  local: OrphanCandidate[];
  remote: OrphanCandidate[];
}

export interface RenamePair {
  oldPath: string;
  newPath: string;
}

interface AmbiguousRenameWarning {
  hash: string;
  localPaths: string[];
  remotePaths: string[];
}

interface RenameResolution {
  renamed: RenamePair[];
  added: string[];
  deleted: string[];
  ambiguousWarnings: AmbiguousRenameWarning[];
}

const basename = (filePath: string): string => filePath.split("/").pop() ?? filePath;

export const buildHashGroups = (
  local: OrphanCandidate[],
  remote: OrphanCandidate[],
): HashGroup[] => {
  const groupsByHash = new Map<string, HashGroup>();

  for (const candidate of local) {
    const group = groupsByHash.get(candidate.hash) ?? {
      hash: candidate.hash,
      local: [],
      remote: [],
    };

    group.local.push(candidate);
    groupsByHash.set(candidate.hash, group);
  }

  for (const candidate of remote) {
    const group = groupsByHash.get(candidate.hash) ?? {
      hash: candidate.hash,
      local: [],
      remote: [],
    };

    group.remote.push(candidate);
    groupsByHash.set(candidate.hash, group);
  }

  return [...groupsByHash.values()];
};

const resolveGroup = (group: HashGroup, resolution: RenameResolution): void => {
  if (group.local.length === 0) {
    for (const candidate of group.remote) {
      resolution.deleted.push(candidate.path);
    }

    return;
  }

  if (group.remote.length === 0) {
    for (const candidate of group.local) {
      resolution.added.push(candidate.path);
    }

    return;
  }

  if (group.local.length === 1 && group.remote.length === 1) {
    resolution.renamed.push({ oldPath: group.remote[0].path, newPath: group.local[0].path });

    return;
  }

  const remainingLocal = [...group.local];
  const remainingRemote = [...group.remote];

  // Pull out pairs where exactly one candidate on each remaining side shares a filename.
  for (const localCandidate of [...remainingLocal]) {
    const matchingLocal = remainingLocal.filter(
      (candidate) => basename(candidate.path) === basename(localCandidate.path),
    );
    const matchingRemote = remainingRemote.filter(
      (candidate) => basename(candidate.path) === basename(localCandidate.path),
    );

    if (matchingLocal.length === 1 && matchingRemote.length === 1) {
      resolution.renamed.push({ oldPath: matchingRemote[0].path, newPath: localCandidate.path });

      remainingLocal.splice(remainingLocal.indexOf(localCandidate), 1);
      remainingRemote.splice(remainingRemote.indexOf(matchingRemote[0]), 1);
    }
  }

  // Whatever is left after that has no filename evidence either way; report it, don't guess.
  if (remainingLocal.length > 0 && remainingRemote.length > 0) {
    resolution.ambiguousWarnings.push({
      hash: group.hash,
      localPaths: remainingLocal.map((candidate) => candidate.path),
      remotePaths: remainingRemote.map((candidate) => candidate.path),
    });
  }

  for (const candidate of remainingLocal) {
    resolution.added.push(candidate.path);
  }

  for (const candidate of remainingRemote) {
    resolution.deleted.push(candidate.path);
  }
};

export const resolveRenames = (groups: HashGroup[]): RenameResolution => {
  const resolution: RenameResolution = {
    renamed: [],
    added: [],
    deleted: [],
    ambiguousWarnings: [],
  };

  for (const group of groups) {
    resolveGroup(group, resolution);
  }

  return resolution;
};
