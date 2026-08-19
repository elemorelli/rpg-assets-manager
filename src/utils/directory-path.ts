export const getParentPath = (relativePath: string): string => {
  const lastSlashIndex = relativePath.lastIndexOf("/");

  return lastSlashIndex === -1 ? "" : relativePath.slice(0, lastSlashIndex);
};

export const getAncestorPaths = (relativePath: string): string[] => {
  const ancestors: string[] = [];
  let current = relativePath;

  while (current !== "") {
    const parent = getParentPath(current);

    ancestors.push(parent);
    current = parent;
  }

  return ancestors;
};
