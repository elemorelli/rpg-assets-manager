import { describe, expect, it } from "vitest";
import { resolveSafeRelativePath, UnsafePathError } from "../safePath.ts";

describe("resolveSafeRelativePath", () => {
  it("returns a nested relative path unchanged", () => {
    expect(resolveSafeRelativePath("tiles/forest.png")).toBe("tiles/forest.png");
  });

  it("treats an empty string as the tree root", () => {
    expect(resolveSafeRelativePath("")).toBe("");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(resolveSafeRelativePath("tiles\\forest.png")).toBe("tiles/forest.png");
  });

  it("collapses duplicate slashes and single-dot segments", () => {
    expect(resolveSafeRelativePath("tiles//./forest.png")).toBe("tiles/forest.png");
  });

  it("rejects an absolute path", () => {
    expect(() => resolveSafeRelativePath("/etc/passwd")).toThrow(UnsafePathError);
  });

  it("rejects a path containing a parent-directory segment", () => {
    expect(() => resolveSafeRelativePath("tiles/../../etc/passwd")).toThrow(UnsafePathError);
  });
});
