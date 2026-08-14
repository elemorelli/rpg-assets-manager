import { xxhash3 } from "hash-wasm";

export const hashBuffer = (buffer: Buffer): Promise<string> => xxhash3(buffer);
