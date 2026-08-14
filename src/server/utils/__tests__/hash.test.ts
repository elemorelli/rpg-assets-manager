import { describe, expect, it } from "vitest";
import { hashBuffer } from "../hash.ts";

describe("hashBuffer", () => {
  it("returns the same hash for identical content", async () => {
    const first = await hashBuffer(Buffer.from("forest tile"));
    const second = await hashBuffer(Buffer.from("forest tile"));

    expect(first).toBe(second);
  });

  it("returns different hashes for different content", async () => {
    const first = await hashBuffer(Buffer.from("forest tile"));
    const second = await hashBuffer(Buffer.from("forest tile v2"));

    expect(first).not.toBe(second);
  });

  it("returns a lowercase hex string", async () => {
    const hash = await hashBuffer(Buffer.from("forest tile"));

    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("hashes an empty buffer without throwing", async () => {
    const hash = await hashBuffer(Buffer.alloc(0));

    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});
