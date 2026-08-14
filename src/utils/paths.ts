export const joinRelativePath = (base: string, name: string): string =>
  base ? `${base}/${name}` : name;

export const parentDirectory = (relativePath: string): string => {
  const segments = relativePath.split("/");

  segments.pop();

  return segments.join("/");
};
