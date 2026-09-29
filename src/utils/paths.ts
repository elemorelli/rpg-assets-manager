export const joinRelativePath = (base: string, name: string): string =>
  base ? `${base}/${name}` : name;

// Paths inside the root directory have no leading prefix, so the root maps to "".
export const toDirectoryPrefix = (relativeDir: string): string =>
  relativeDir === "" ? "" : `${relativeDir}/`;
