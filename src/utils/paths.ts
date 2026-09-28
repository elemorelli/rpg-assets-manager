export const joinRelativePath = (base: string, name: string): string =>
  base ? `${base}/${name}` : name;
