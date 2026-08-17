import { describe, expect, it } from "vitest";

import { computeDirectorySyncStatus } from "../sync-status.ts";

describe("computeDirectorySyncStatus", () => {
  it("does not mark a file pending when its local and remote hashes match", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", "hash-a"]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingFileNames).toEqual(new Set());
  });

  it("marks a file pending when its local hash differs from the remote hash", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", "hash-b"]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingFileNames).toEqual(new Set(["forest.png"]));
  });

  it("marks a file pending when it has no remote counterpart yet (newly added)", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", "hash-a"]]),
      remoteIndex: new Map(),
    });

    expect(result.pendingFileNames).toEqual(new Set(["forest.png"]));
  });

  it("does not mark a file pending when it has never been scanned locally", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map(),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingFileNames).toEqual(new Set());
  });

  it("scopes pending file lookups to the requested directory", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "tiles",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([
        ["tiles/forest.png", "hash-b"],
        ["forest.png", "hash-c"],
      ]),
      remoteIndex: new Map([
        ["tiles/forest.png", { hash: "hash-a", size: 100 }],
        ["forest.png", { hash: "hash-c", size: 50 }],
      ]),
    });

    expect(result.pendingFileNames).toEqual(new Set(["forest.png"]));
  });

  it("reports a file present remotely but missing from disk as deleted", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: [],
      localIndex: new Map(),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.deletedFiles).toEqual([{ name: "forest.png", size: 100 }]);
  });

  it("does not report a deleted file that still exists on disk", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", "hash-a"]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.deletedFiles).toEqual([]);
  });

  it("does not report a remote file nested deeper than a direct child as deleted", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map(),
      remoteIndex: new Map([["tiles/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.deletedFiles).toEqual([]);
  });

  it("marks a directory pending when a direct child file changed", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles/forest.png", "hash-b"]]),
      remoteIndex: new Map([["tiles/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set(["tiles"]));
  });

  it("marks a directory pending when a deeply nested descendant changed", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles/forests/deep/leaf.png", "hash-b"]]),
      remoteIndex: new Map([["tiles/forests/deep/leaf.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set(["tiles"]));
  });

  it("does not mark a directory pending when none of its descendants changed", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles/forest.png", "hash-a"]]),
      remoteIndex: new Map([["tiles/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set());
  });

  it("does not confuse a sibling directory with a similarly named prefix", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles-extra/forest.png", "hash-b"]]),
      remoteIndex: new Map([["tiles-extra/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set());
  });
});
