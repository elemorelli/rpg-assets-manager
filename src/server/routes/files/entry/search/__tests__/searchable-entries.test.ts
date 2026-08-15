import { describe, expect, it } from "vitest";
import {
  MAX_SEARCH_RESULTS,
  type SearchableEntry,
  searchEntriesByName,
} from "../searchable-entries.ts";

describe("searchEntriesByName", () => {
  it("returns an empty array for a blank query", () => {
    const entries: SearchableEntry[] = [{ relativePath: "tiles/forest.png", type: "file" }];

    expect(searchEntriesByName(entries, "   ")).toEqual([]);
  });

  it("matches case-insensitively against the entry's basename", () => {
    const entries: SearchableEntry[] = [
      { relativePath: "tiles/Forest.png", type: "file" },
      { relativePath: "maps/kingdom.png", type: "file" },
    ];

    expect(searchEntriesByName(entries, "forest")).toEqual([
      { relativePath: "tiles/Forest.png", type: "file" },
    ]);
  });

  it("does not match a directory segment that only appears earlier in the path", () => {
    const entries: SearchableEntry[] = [{ relativePath: "forest/kingdom.png", type: "file" }];

    expect(searchEntriesByName(entries, "forest")).toEqual([]);
  });

  it("sorts matches alphabetically by full relative path", () => {
    const entries: SearchableEntry[] = [
      { relativePath: "tiles/zzz-forest.png", type: "file" },
      { relativePath: "audio/forest-ambience.ogg", type: "file" },
    ];

    expect(searchEntriesByName(entries, "forest")).toEqual([
      { relativePath: "audio/forest-ambience.ogg", type: "file" },
      { relativePath: "tiles/zzz-forest.png", type: "file" },
    ]);
  });

  it("caps the number of results at MAX_SEARCH_RESULTS", () => {
    const entries: SearchableEntry[] = Array.from(
      { length: MAX_SEARCH_RESULTS + 1 },
      (_, index) => ({ relativePath: `tiles/forest-${index}.png`, type: "file" as const }),
    );

    expect(searchEntriesByName(entries, "forest")).toHaveLength(MAX_SEARCH_RESULTS);
  });
});
