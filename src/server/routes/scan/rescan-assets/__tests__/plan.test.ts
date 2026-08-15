import { describe, expect, it } from "vitest";

import { computeRescanPlan } from "../plan.ts";

describe("computeRescanPlan", () => {
  it("puts a brand new file in toHash", () => {
    const current = [{ relativePath: "tiles/new.png", size: 10, mtimeMs: 1000 }];

    const plan = computeRescanPlan([], current);

    expect(plan.toHash).toEqual(current);
    expect(plan.unchanged).toEqual([]);
    expect(plan.toRemove).toEqual([]);
  });

  it("keeps a file with identical size and mtime as unchanged", () => {
    const previous = [{ path: "tiles/forest.png", size: 10, mtimeMs: 1000, hash: "abc" }];
    const current = [{ relativePath: "tiles/forest.png", size: 10, mtimeMs: 1000 }];

    const plan = computeRescanPlan(previous, current);

    expect(plan.unchanged).toEqual(previous);
    expect(plan.toHash).toEqual([]);
  });

  it("re-hashes a file whose mtime changed", () => {
    const previous = [{ path: "tiles/forest.png", size: 10, mtimeMs: 1000, hash: "abc" }];
    const current = [{ relativePath: "tiles/forest.png", size: 10, mtimeMs: 2000 }];

    const plan = computeRescanPlan(previous, current);

    expect(plan.toHash).toEqual(current);
    expect(plan.unchanged).toEqual([]);
  });

  it("re-hashes a file whose size changed", () => {
    const previous = [{ path: "tiles/forest.png", size: 10, mtimeMs: 1000, hash: "abc" }];
    const current = [{ relativePath: "tiles/forest.png", size: 20, mtimeMs: 1000 }];

    const plan = computeRescanPlan(previous, current);

    expect(plan.toHash).toEqual(current);
  });

  it("marks a file missing from the walk as toRemove", () => {
    const previous = [{ path: "tiles/gone.png", size: 10, mtimeMs: 1000, hash: "abc" }];

    const plan = computeRescanPlan(previous, []);

    expect(plan.toRemove).toEqual(["tiles/gone.png"]);
  });

  it("forces every file into toHash when forceRehash is set, even if unchanged", () => {
    const previous = [{ path: "tiles/forest.png", size: 10, mtimeMs: 1000, hash: "abc" }];
    const current = [{ relativePath: "tiles/forest.png", size: 10, mtimeMs: 1000 }];

    const plan = computeRescanPlan(previous, current, { forceRehash: true });

    expect(plan.toHash).toEqual(current);
    expect(plan.unchanged).toEqual([]);
  });
});
