import { describe, expect, it } from "vitest";

import { toggleSetMember } from "../toggle-set-member.ts";

describe("toggleSetMember", () => {
  it("adds a value that is not in the set", () => {
    expect(toggleSetMember(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
  });

  it("removes a value that is already in the set", () => {
    expect(toggleSetMember(new Set(["a", "b"]), "a")).toEqual(new Set(["b"]));
  });

  it("returns a new set without mutating the original, so React sees a state change", () => {
    const original = new Set(["a"]);

    const toggled = toggleSetMember(original, "b");

    expect(toggled).not.toBe(original);
    expect(original).toEqual(new Set(["a"]));
  });
});
