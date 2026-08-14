import { describe, expect, it } from "vitest";
import { chunkArray } from "../chunkArray.ts";

const THIRD_ITEM = 3;
const FOURTH_ITEM = 4;
const FIFTH_ITEM = 5;

describe("chunkArray", () => {
  it("splits items into chunks of the given size", () => {
    expect(chunkArray([1, 2, THIRD_ITEM, FOURTH_ITEM, FIFTH_ITEM], 2)).toEqual([
      [1, 2],
      [THIRD_ITEM, FOURTH_ITEM],
      [FIFTH_ITEM],
    ]);
  });

  it("returns one chunk when chunkSize is larger than the input", () => {
    expect(chunkArray([1, 2], 10)).toEqual([[1, 2]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunkArray([], 2)).toEqual([]);
  });

  it("returns exact chunks with no remainder", () => {
    expect(chunkArray([1, 2, THIRD_ITEM, FOURTH_ITEM], 2)).toEqual([
      [1, 2],
      [THIRD_ITEM, FOURTH_ITEM],
    ]);
  });
});
