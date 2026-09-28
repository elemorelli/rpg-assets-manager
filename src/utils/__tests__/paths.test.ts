import { describe, expect, it } from "vitest";

import { joinRelativePath } from "../paths.ts";

describe("joinRelativePath", () => {
  it("returns the name alone when the base is empty", () => {
    expect(joinRelativePath("", "tiles")).toBe("tiles");
  });

  it("joins a non-empty base and name with a slash", () => {
    expect(joinRelativePath("tiles", "forest.png")).toBe("tiles/forest.png");
  });
});
