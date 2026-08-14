import { argon2Verify } from "hash-wasm";
import { describe, expect, it } from "vitest";
import { hashPassword } from "../hash-password-core.ts";

describe("hashPassword", () => {
  it("produces an argon2id encoded hash that verifies against the original password", async () => {
    const hash = await hashPassword("correct-password");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(argon2Verify({ password: "correct-password", hash })).resolves.toBe(true);
  });

  it("produces a different hash each time, due to a random salt", async () => {
    const first = await hashPassword("correct-password");
    const second = await hashPassword("correct-password");

    expect(first).not.toBe(second);
  });
});
