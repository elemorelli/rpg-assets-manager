import { describe, expect, it } from "vitest";

import { readDroppedFiles } from "../read-dropped-files.ts";

const entryName = (fullPath: string): string => fullPath.split("/").pop() ?? fullPath;

const makeFileEntry = (fullPath: string, file: File): FileSystemFileEntry =>
  ({
    isFile: true,
    isDirectory: false,
    name: entryName(fullPath),
    fullPath,
    file: (success: (file: File) => void) => success(file),
  }) as FileSystemFileEntry;

const makeDirectoryEntry = (
  fullPath: string,
  children: FileSystemEntry[],
): FileSystemDirectoryEntry =>
  ({
    isFile: false,
    isDirectory: true,
    name: entryName(fullPath),
    fullPath,
    createReader: () => {
      let remaining = children;

      return {
        readEntries: (success: (entries: FileSystemEntry[]) => void) => {
          const batch = remaining;

          remaining = [];
          success(batch);
        },
      };
    },
  }) as FileSystemDirectoryEntry;

const makeDataTransfer = (entries: (FileSystemEntry | null)[], files: File[] = []): DataTransfer =>
  ({
    items: entries.map((entry) => ({ webkitGetAsEntry: () => entry })),
    files,
  }) as unknown as DataTransfer;

describe("readDroppedFiles", () => {
  it("reads a single dropped file", async () => {
    const file = new File(["content"], "map.png", { type: "image/png" });
    const dataTransfer = makeDataTransfer([makeFileEntry("/map.png", file)]);

    const result = await readDroppedFiles(dataTransfer);

    expect(result).toEqual([{ relativePath: "map.png", file }]);
  });

  it("recursively reads files inside a dropped folder, preserving the relative path", async () => {
    const greeting = new File(["a"], "greeting.mp3", { type: "audio/mpeg" });
    const hello = new File(["b"], "hello.mp3", { type: "audio/mpeg" });
    const folder = makeDirectoryEntry("/audio", [
      makeFileEntry("/audio/greeting.mp3", greeting),
      makeDirectoryEntry("/audio/npc", [makeFileEntry("/audio/npc/hello.mp3", hello)]),
    ]);

    const result = await readDroppedFiles(makeDataTransfer([folder]));

    expect(result).toEqual(
      expect.arrayContaining([
        { relativePath: "audio/greeting.mp3", file: greeting },
        { relativePath: "audio/npc/hello.mp3", file: hello },
      ]),
    );
    expect(result).toHaveLength(2);
  });

  it("returns nothing for an empty directory", async () => {
    const result = await readDroppedFiles(makeDataTransfer([makeDirectoryEntry("/empty", [])]));

    expect(result).toEqual([]);
  });

  it("falls back to the flat file list when webkitGetAsEntry is unavailable", async () => {
    const file = new File(["content"], "map.png", { type: "image/png" });
    const dataTransfer = makeDataTransfer([null], [file]);

    const result = await readDroppedFiles(dataTransfer);

    expect(result).toEqual([{ relativePath: "map.png", file }]);
  });
});
