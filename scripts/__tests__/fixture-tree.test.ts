import { describe, expect, it } from "vitest";
import { buildFixtureTreeManifest } from "../fixture-tree.ts";

describe("buildFixtureTreeManifest", () => {
  it("has exactly one duplicate-hash pair", () => {
    const files = buildFixtureTreeManifest();
    const byContent = new Map<string, string[]>();

    for (const file of files) {
      const key = file.content.toString("base64");
      const paths = byContent.get(key) ?? [];

      paths.push(file.relativePath);
      byContent.set(key, paths);
    }

    const duplicateGroups = [...byContent.values()].filter((paths) => paths.length > 1);

    expect(duplicateGroups).toEqual([["tiles/campfire.png", "handouts/campfire-card.png"]]);
  });

  it("includes exactly one .skip control file", () => {
    const files = buildFixtureTreeManifest();
    const skipFiles = files.filter((file) => file.relativePath.endsWith(".skip"));

    expect(skipFiles).toHaveLength(1);
    expect(skipFiles[0]?.content.length).toBe(0);
  });

  it("only ever produces relative, non-traversing paths", () => {
    const files = buildFixtureTreeManifest();

    for (const file of files) {
      expect(file.relativePath.startsWith("/")).toBe(false);
      expect(file.relativePath).not.toContain("..");
    }
  });
});
