import { describe, expect, it } from "vitest";
import { isValidDropTarget } from "../dragDrop.ts";

describe("isValidDropTarget", () => {
  it("rejects dropping a file onto its current parent directory", () => {
    const entry = { relativePath: "tiles/forest.png", type: "file" as const };

    expect(isValidDropTarget(entry, "tiles")).toBe(false);
  });

  it("allows dropping a file onto a different directory", () => {
    const entry = { relativePath: "tiles/forest.png", type: "file" as const };

    expect(isValidDropTarget(entry, "backgrounds")).toBe(true);
  });

  it("allows dropping a top-level file into a subdirectory", () => {
    const entry = { relativePath: "forest.png", type: "file" as const };

    expect(isValidDropTarget(entry, "tiles")).toBe(true);
  });

  it("rejects dropping a directory onto itself", () => {
    const entry = { relativePath: "tiles", type: "directory" as const };

    expect(isValidDropTarget(entry, "tiles")).toBe(false);
  });

  it("rejects dropping a directory onto its own descendant", () => {
    const entry = { relativePath: "tiles", type: "directory" as const };

    expect(isValidDropTarget(entry, "tiles/legacy-pack")).toBe(false);
  });

  it("allows dropping a directory onto an unrelated directory", () => {
    const entry = { relativePath: "tiles", type: "directory" as const };

    expect(isValidDropTarget(entry, "backgrounds")).toBe(true);
  });
});
