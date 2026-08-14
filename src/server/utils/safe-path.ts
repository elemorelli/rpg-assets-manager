export class UnsafePathError extends Error {}

export const resolveSafeRelativePath = (requestedPath: string): string => {
  const normalized = requestedPath.split("\\").join("/");

  if (normalized.startsWith("/")) {
    throw new UnsafePathError(`Path must be relative: ${requestedPath}`);
  }

  const segments = normalized.split("/").filter((segment) => segment.length > 0 && segment !== ".");

  if (segments.some((segment) => segment === "..")) {
    throw new UnsafePathError(`Path escapes the asset tree root: ${requestedPath}`);
  }

  return segments.join("/");
};
