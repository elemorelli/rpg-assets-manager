import { describe, expect, it } from "vitest";

import { generateMacro } from "../generate-macro.ts";

describe("generateMacro", () => {
  it("returns null when there are no renames", () => {
    expect(generateMacro([], "https://assets.example.com", [])).toBeNull();
  });

  it("includes an exact old-to-new URL mapping for each rename", () => {
    const macro = generateMacro(
      [{ oldPath: "tiles/old.webp", newPath: "tiles/new.webp" }],
      "https://assets.example.com",
      [],
    );

    expect(macro).toContain(
      '["https://assets.example.com/tiles/old.webp", "https://assets.example.com/tiles/new.webp"]',
    );
  });

  it("adds a percent-encoded variant of the old URL when it differs from the plain one", () => {
    const macro = generateMacro(
      [{ oldPath: "book images/old cover.webp", newPath: "book_images/new-cover.webp" }],
      "https://assets.example.com",
      [],
    );

    const plainUrl = "https://assets.example.com/book images/old cover.webp";
    const encodedUrl = encodeURI(plainUrl);

    expect(macro).toContain(JSON.stringify(plainUrl));
    expect(macro).toContain(JSON.stringify(encodedUrl));
  });

  it("does not duplicate the key when percent-encoding does not change the URL", () => {
    const macro = generateMacro(
      [{ oldPath: "tiles/old.webp", newPath: "tiles/new.webp" }],
      "https://assets.example.com",
      [],
    );

    const occurrences = macro?.split('"https://assets.example.com/tiles/old.webp"').length ?? 0;

    expect(occurrences - 1).toBe(1);
  });

  it("lists the configured world names in the header", () => {
    const macro = generateMacro(
      [{ oldPath: "a.png", newPath: "b.png" }],
      "https://assets.example.com",
      ["kingmaker", "stolen-fate"],
    );

    expect(macro).toContain("kingmaker, stolen-fate");
  });

  it("notes when no world names are configured", () => {
    const macro = generateMacro(
      [{ oldPath: "a.png", newPath: "b.png" }],
      "https://assets.example.com",
      [],
    );

    expect(macro).toContain("No worlds configured");
  });

  it("defaults DRY_RUN to true", () => {
    const macro = generateMacro(
      [{ oldPath: "a.png", newPath: "b.png" }],
      "https://assets.example.com",
      [],
    );

    expect(macro).toContain("const DRY_RUN = true;");
  });

  it("records the expected rename count for the dry-run report", () => {
    const macro = generateMacro(
      [
        { oldPath: "a.png", newPath: "b.png" },
        { oldPath: "c.png", newPath: "d.png" },
      ],
      "https://assets.example.com",
      [],
    );

    expect(macro).toContain("const TOTAL_EXPECTED_RENAMES = 2;");
  });

  it("escapes regex-special characters in the base URL for the match pattern", () => {
    const macro = generateMacro(
      [{ oldPath: "a.png", newPath: "b.png" }],
      "https://assets.example.com",
      [],
    );

    expect(macro).toContain("assets\\\\.example\\\\.com");
  });
});
