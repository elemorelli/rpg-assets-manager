import crypto from "node:crypto";
import { argon2id } from "hash-wasm";

const ARGON2ID_MEMORY_SIZE_KIB = 19456;
const ARGON2ID_ITERATIONS = 2;
const ARGON2ID_PARALLELISM = 1;
const ARGON2ID_HASH_LENGTH_BYTES = 32;
const ARGON2ID_SALT_LENGTH_BYTES = 16;

export const hashPassword = (password: string): Promise<string> =>
  argon2id({
    password,
    salt: crypto.randomBytes(ARGON2ID_SALT_LENGTH_BYTES),
    iterations: ARGON2ID_ITERATIONS,
    parallelism: ARGON2ID_PARALLELISM,
    memorySize: ARGON2ID_MEMORY_SIZE_KIB,
    hashLength: ARGON2ID_HASH_LENGTH_BYTES,
    outputType: "encoded",
  });
