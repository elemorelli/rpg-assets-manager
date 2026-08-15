import { describe, expect, it } from "vitest";

import { parseCombinedReport } from "../combined-report.ts";

describe("parseCombinedReport", () => {
  it("counts matching paths without listing them", () => {
    const result = parseCombinedReport("= tiles/forest.png\n= tiles/river.png\n");

    expect(result.matchCount).toBe(2);
    expect(result.missingOnSource).toEqual([]);
    expect(result.missingOnDestination).toEqual([]);
    expect(result.differs).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("collects paths missing on the source, i.e. present only on the destination", () => {
    const result = parseCombinedReport("- tiles/orphaned.png\n");

    expect(result.missingOnSource).toEqual(["tiles/orphaned.png"]);
  });

  it("collects paths missing on the destination, i.e. present only on the source", () => {
    const result = parseCombinedReport("+ tiles/unsynced.png\n");

    expect(result.missingOnDestination).toEqual(["tiles/unsynced.png"]);
  });

  it("collects paths present on both sides but with different content", () => {
    const result = parseCombinedReport("* tiles/stale.png\n");

    expect(result.differs).toEqual(["tiles/stale.png"]);
  });

  it("collects paths that errored while checking", () => {
    const result = parseCombinedReport("! tiles/unreadable.png\n");

    expect(result.errors).toEqual(["tiles/unreadable.png"]);
  });

  it("ignores blank lines", () => {
    const result = parseCombinedReport("= tiles/forest.png\n\n+ tiles/unsynced.png\n");

    expect(result.matchCount).toBe(1);
    expect(result.missingOnDestination).toEqual(["tiles/unsynced.png"]);
  });

  it("returns an empty result for an empty report", () => {
    const result = parseCombinedReport("");

    expect(result).toEqual({
      matchCount: 0,
      missingOnSource: [],
      missingOnDestination: [],
      differs: [],
      errors: [],
    });
  });
});
