import { createXXHash3, type IHasher, xxhash3 } from "hash-wasm";

export type IncrementalHasher = IHasher;

export const hashBuffer = (buffer: Buffer): Promise<string> => xxhash3(buffer);

export const createIncrementalHasher = async (): Promise<IncrementalHasher> => {
  const hasher = await createXXHash3();

  hasher.init();

  return hasher;
};
