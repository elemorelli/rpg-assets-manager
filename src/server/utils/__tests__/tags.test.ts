import { describe, expect, it } from "vitest";

import { normalizeTags } from "../tags.ts";

describe("normalizeTags", () => {
  it("trims and lowercases every tag", () => {
    expect(normalizeTags([" NPC ", "Loot"])).toEqual(["npc", "loot"]);
  });

  it("drops empty and whitespace-only tags", () => {
    expect(normalizeTags(["npc", "  ", ""])).toEqual(["npc"]);
  });

  it("deduplicates tags that only differ by case or surrounding whitespace", () => {
    expect(normalizeTags(["npc", "NPC", " npc "])).toEqual(["npc"]);
  });

  it("returns an empty array for an empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});
