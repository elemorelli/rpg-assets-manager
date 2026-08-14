import { argon2Verify } from "hash-wasm";

export const verifyPassword = (password: string, hash: string): Promise<boolean> =>
  argon2Verify({ password, hash }).catch(() => false);
