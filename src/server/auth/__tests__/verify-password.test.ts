import crypto from "node:crypto";
import { argon2id } from "hash-wasm";
import { describe, expect, it } from "vitest";

import { verifyPassword } from "../verify-password.ts";

const ARGON2ID_MEMORY_SIZE_KIB = 19456;
const ARGON2ID_ITERATIONS = 2;
const ARGON2ID_PARALLELISM = 1;
const ARGON2ID_HASH_LENGTH_BYTES = 32;
const ARGON2ID_SALT_LENGTH_BYTES = 16;

const hashForTest = (password: string): Promise<string> =>
  argon2id({
    password,
    salt: crypto.randomBytes(ARGON2ID_SALT_LENGTH_BYTES),
    iterations: ARGON2ID_ITERATIONS,
    parallelism: ARGON2ID_PARALLELISM,
    memorySize: ARGON2ID_MEMORY_SIZE_KIB,
    hashLength: ARGON2ID_HASH_LENGTH_BYTES,
    outputType: "encoded",
  });

describe("verifyPassword", () => {
  it("resolves true for the password that produced the hash", async () => {
    const hash = await hashForTest("correct-password");

    await expect(verifyPassword("correct-password", hash)).resolves.toBe(true);
  });

  it("resolves false for a wrong password", async () => {
    const hash = await hashForTest("correct-password");

    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("resolves false instead of throwing for a malformed hash", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });
});
