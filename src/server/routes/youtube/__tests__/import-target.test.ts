import { describe, expect, it } from "vitest";

import { HttpError } from "#server/errors/index.ts";
import { UnsafePathError } from "#server/utils/safe-path.ts";

import { resolveImportTarget } from "../import-target.ts";

const VIDEO_URL = "https://youtu.be/abc123";
const BAD_REQUEST = 400;

describe("resolveImportTarget", () => {
  it("builds the destination path, normalizes tags and defaults overwrite to false", () => {
    expect(
      resolveImportTarget({
        url: VIDEO_URL,
        directoryPath: "music/combat",
        fileName: " epic-battle ",
        tags: ["Epic", " combat ", "epic"],
      }),
    ).toEqual({
      url: VIDEO_URL,
      relativePath: "music/combat/epic-battle.ogg",
      tags: ["epic", "combat"],
      overwrite: false,
    });
  });

  it("imports into the tree root when the directory is empty", () => {
    expect(resolveImportTarget({ url: VIDEO_URL, directoryPath: "", fileName: "a" })).toMatchObject(
      { relativePath: "a.ogg" },
    );
  });

  it("does not double a typed .ogg extension", () => {
    expect(
      resolveImportTarget({ url: VIDEO_URL, directoryPath: "", fileName: "battle.ogg" }),
    ).toMatchObject({ relativePath: "battle.ogg" });
  });

  it("rejects a non-YouTube URL with a 400", () => {
    expect(() => resolveImportTarget({ url: "https://evil.example/x", fileName: "a" })).toThrow(
      expect.objectContaining({ message: "Not a YouTube URL", statusCode: BAD_REQUEST }),
    );
  });

  it("rejects an invalid file name with a 400", () => {
    expect(() => resolveImportTarget({ url: VIDEO_URL, fileName: "../escape" })).toThrow(HttpError);
  });

  it("rejects a directory that escapes the tree", () => {
    expect(() =>
      resolveImportTarget({ url: VIDEO_URL, directoryPath: "../outside", fileName: "a" }),
    ).toThrow(UnsafePathError);
  });

  it("ignores non-string tags", () => {
    const nonStringTag = 3;
    const body = {
      url: VIDEO_URL,
      fileName: "a",
      tags: ["ok", nonStringTag] as unknown as string[],
    };

    expect(resolveImportTarget(body).tags).toEqual(["ok"]);
  });
});
