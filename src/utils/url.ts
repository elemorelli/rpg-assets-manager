export const joinUrl = (baseUrl: string, relativePath: string): string => {
  const trimmedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

  return `${trimmedBaseUrl}/${relativePath}`;
};
