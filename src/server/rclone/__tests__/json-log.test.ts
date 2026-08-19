import { describe, expect, it } from "vitest";

import { parseCheckStats, parseCompletedFilePath } from "../json-log.ts";

describe("parseCompletedFilePath", () => {
  it("returns the object path for a newly copied file", () => {
    const line = JSON.stringify({ msg: "Copied (new)", object: "tiles/forest.png" });

    expect(parseCompletedFilePath(line)).toBe("tiles/forest.png");
  });

  it("returns the object path for a replaced file", () => {
    const line = JSON.stringify({ msg: "Copied (replaced existing)", object: "a.txt" });

    expect(parseCompletedFilePath(line)).toBe("a.txt");
  });

  it("returns the object path for a deleted file", () => {
    const line = JSON.stringify({ msg: "Deleted", object: "gone.png" });

    expect(parseCompletedFilePath(line)).toBe("gone.png");
  });

  it("returns null for unrelated log messages", () => {
    const line = JSON.stringify({ msg: "Using md5 for hash comparisons" });

    expect(parseCompletedFilePath(line)).toBeNull();
  });

  it("returns null for a completion message without an object field", () => {
    const line = JSON.stringify({ msg: "Copied (new)" });

    expect(parseCompletedFilePath(line)).toBeNull();
  });

  it("returns null for a line that is not valid JSON", () => {
    expect(parseCompletedFilePath("not json")).toBeNull();
  });

  it("returns null for an empty line", () => {
    expect(parseCompletedFilePath("")).toBeNull();
  });
});

describe("parseCheckStats", () => {
  it("returns done and total from a periodic stats line", () => {
    const line = JSON.stringify({
      msg: "stats update",
      stats: { checks: 12, totalChecks: 40 },
    });

    expect(parseCheckStats(line)).toEqual({ done: 12, total: 40 });
  });

  it("returns null for a line without a stats field", () => {
    const line = JSON.stringify({ msg: "Using md5 for hash comparisons" });

    expect(parseCheckStats(line)).toBeNull();
  });

  it("returns null for a stats field missing the check counts", () => {
    const line = JSON.stringify({ msg: "stats update", stats: { bytes: 10 } });

    expect(parseCheckStats(line)).toBeNull();
  });

  it("returns null for a line that is not valid JSON", () => {
    expect(parseCheckStats("not json")).toBeNull();
  });
});
