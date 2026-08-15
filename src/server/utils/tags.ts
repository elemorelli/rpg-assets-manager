export const normalizeTags = (rawTags: string[]): string[] => {
  const normalized = rawTags.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0);

  return [...new Set(normalized)];
};
