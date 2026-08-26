import { describe, expect, it } from "vitest";

import {
  computeDirectorySyncStatus,
  computeTreeWidePendingDirectoryPaths,
} from "../sync-status.ts";

describe("computeDirectorySyncStatus", () => {
  it("does not mark a file pending when its local and remote hashes match", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", { hash: "hash-a" }]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingFileNames).toEqual(new Set());
  });

  it("marks a file pending when its local hash differs from the remote hash", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", { hash: "hash-b" }]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingFileNames).toEqual(new Set(["forest.png"]));
  });

  it("marks a file new when it has no remote counterpart yet and no matching deleted hash", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest.png"],
      directoryNames: [],
      localIndex: new Map([["forest.png", { hash: "hash-a" }]]),
      remoteIndex: new Map(),
    });

    expect(result.newFileNames).toEqual(new Set(["forest.png"]));
    expect(result.pendingFileNames).toEqual(new Set());
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
        ["tiles/forest.png", { hash: "hash-b" }],
        ["forest.png", { hash: "hash-c" }],
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
      localIndex: new Map([["forest.png", { hash: "hash-a" }]]),
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
      localIndex: new Map([["tiles/forest.png", { hash: "hash-b" }]]),
      remoteIndex: new Map([["tiles/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set(["tiles"]));
  });

  it("marks a directory pending when a deeply nested descendant changed", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles/forests/deep/leaf.png", { hash: "hash-b" }]]),
      remoteIndex: new Map([["tiles/forests/deep/leaf.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set(["tiles"]));
  });

  it("does not mark a directory pending when none of its descendants changed", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles/forest.png", { hash: "hash-a" }]]),
      remoteIndex: new Map([["tiles/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set());
  });

  it("does not confuse a sibling directory with a similarly named prefix", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: [],
      directoryNames: ["tiles"],
      localIndex: new Map([["tiles-extra/forest.png", { hash: "hash-b" }]]),
      remoteIndex: new Map([["tiles-extra/forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.pendingDirectoryNames).toEqual(new Set());
  });

  it("treats a file with the same hash as a missing remote file as renamed, not new or pending", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest-renamed.png"],
      directoryNames: [],
      localIndex: new Map([["forest-renamed.png", { hash: "hash-a" }]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.renamedFileNames).toEqual(new Set(["forest-renamed.png"]));
    expect(result.pendingFileNames).toEqual(new Set());
    expect(result.newFileNames).toEqual(new Set());
  });

  it("does not report the old path of a renamed file as deleted", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["forest-renamed.png"],
      directoryNames: [],
      localIndex: new Map([["forest-renamed.png", { hash: "hash-a" }]]),
      remoteIndex: new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.deletedFiles).toEqual([]);
  });

  it("does not treat unrelated new and deleted files with different hashes as a rename", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["new.png"],
      directoryNames: [],
      localIndex: new Map([["new.png", { hash: "hash-b" }]]),
      remoteIndex: new Map([["gone.png", { hash: "hash-a", size: 100 }]]),
    });

    expect(result.newFileNames).toEqual(new Set(["new.png"]));
    expect(result.deletedFiles).toEqual([{ name: "gone.png", size: 100 }]);
  });

  it("treats a converted file (different hash, matching previousHash) as renamed, not new or pending", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["theme.ogg"],
      directoryNames: [],
      localIndex: new Map([["theme.ogg", { hash: "hash-ogg", previousHash: "hash-wav" }]]),
      remoteIndex: new Map([["theme.wav", { hash: "hash-wav", size: 100 }]]),
    });

    expect(result.renamedFileNames).toEqual(new Set(["theme.ogg"]));
    expect(result.newFileNames).toEqual(new Set());
    expect(result.deletedFiles).toEqual([]);
  });

  it("matches at most one renamed file per deleted hash, leaving extras new and deleted", () => {
    const result = computeDirectorySyncStatus({
      relativeDir: "",
      fileNames: ["copy-a.png", "copy-b.png"],
      directoryNames: [],
      localIndex: new Map([
        ["copy-a.png", { hash: "hash-a" }],
        ["copy-b.png", { hash: "hash-a" }],
      ]),
      remoteIndex: new Map([["original.png", { hash: "hash-a", size: 100 }]]),
    });

    const renamedCount = ["copy-a.png", "copy-b.png"].filter((name) =>
      result.renamedFileNames.has(name),
    ).length;
    const newCount = ["copy-a.png", "copy-b.png"].filter((name) =>
      result.newFileNames.has(name),
    ).length;

    expect(renamedCount).toBe(1);
    expect(newCount).toBe(1);
    expect(result.deletedFiles).toEqual([]);
  });
});

describe("computeTreeWidePendingDirectoryPaths", () => {
  it("marks every ancestor of a changed path as pending", () => {
    const result = computeTreeWidePendingDirectoryPaths(
      new Map([["tiles/forests/deep/leaf.png", { hash: "hash-b" }]]),
      new Map([["tiles/forests/deep/leaf.png", { hash: "hash-a", size: 100 }]]),
    );

    expect(result).toEqual(new Set(["tiles", "tiles/forests", "tiles/forests/deep"]));
  });

  it("does not mark a top-level file's non-existent parent directory", () => {
    const result = computeTreeWidePendingDirectoryPaths(
      new Map([["forest.png", { hash: "hash-b" }]]),
      new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    );

    expect(result).toEqual(new Set());
  });

  it("returns an empty set when nothing changed", () => {
    const result = computeTreeWidePendingDirectoryPaths(
      new Map([["forest.png", { hash: "hash-a" }]]),
      new Map([["forest.png", { hash: "hash-a", size: 100 }]]),
    );

    expect(result).toEqual(new Set());
  });

  it("does not confuse a sibling directory with a similarly named prefix", () => {
    const result = computeTreeWidePendingDirectoryPaths(
      new Map([["tiles-extra/forest.png", { hash: "hash-b" }]]),
      new Map([["tiles-extra/forest.png", { hash: "hash-a", size: 100 }]]),
    );

    expect(result).toEqual(new Set(["tiles-extra"]));
  });
});
