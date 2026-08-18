export type TtlCache<T> = ReturnType<typeof createTtlCache<T>>;

export const createTtlCache = <T>(ttlMs: number) => {
  let cachedPromise: Promise<T> | undefined;
  let fetchedAtMs: number | undefined;

  const isFresh = (): boolean => fetchedAtMs !== undefined && Date.now() - fetchedAtMs < ttlMs;

  const get = async (fetcher: () => Promise<T>): Promise<T> => {
    if (cachedPromise && isFresh()) {
      return cachedPromise;
    }

    fetchedAtMs = Date.now();
    cachedPromise = fetcher();

    try {
      return await cachedPromise;
    } catch (error) {
      cachedPromise = undefined;
      fetchedAtMs = undefined;

      throw error;
    }
  };

  const invalidate = (): void => {
    cachedPromise = undefined;
    fetchedAtMs = undefined;
  };

  return { get, invalidate };
};
