import { describe, expect, it } from "vitest";

import { joinUrl } from "../url.ts";

describe("joinUrl", () => {
  it("joins a base url without a trailing slash to a relative path", () => {
    expect(joinUrl("https://assets.elemorelli.com", "handouts/map.webp")).toBe(
      "https://assets.elemorelli.com/handouts/map.webp",
    );
  });

  it("does not double up the slash when the base url already ends with one", () => {
    expect(joinUrl("https://assets.elemorelli.com/", "handouts/map.webp")).toBe(
      "https://assets.elemorelli.com/handouts/map.webp",
    );
  });
});
