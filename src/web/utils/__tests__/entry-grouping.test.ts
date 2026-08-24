import { describe, expect, it } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { groupEntries } from "../entry-grouping.ts";

const dir = (name: string): DirectoryEntry => ({ name, type: "directory" });
const file = (name: string, tags?: string[]): DirectoryEntry => ({ name, type: "file", tags });

describe("groupEntries", () => {
  it("returns a single unlabeled group when criterion is none", () => {
    const entries = [dir("tiles"), file("a.png")];

    expect(groupEntries(entries, "none")).toEqual([{ label: null, entries }]);
  });

  it("puts all directories into a Directories group first", () => {
    const entries = [dir("tiles"), file("a.png", ["npc"])];

    const groups = groupEntries(entries, "tag");

    expect(groups[0]).toEqual({ label: "Directories", entries: [dir("tiles")] });
  });

  it("creates one group per tag, sorted alphabetically", () => {
    const npcFile = file("npc.png", ["npc"]);
    const tavernFile = file("tavern.png", ["tavern"]);

    const groups = groupEntries([tavernFile, npcFile], "tag");

    expect(groups.map((group) => group.label)).toEqual(["npc", "tavern"]);
  });

  it("puts an untagged file into an Untagged group at the end", () => {
    const tagged = file("a.png", ["npc"]);
    const untagged = file("b.png");

    const groups = groupEntries([tagged, untagged], "tag");

    expect(groups.at(-1)).toEqual({ label: "Untagged", entries: [untagged] });
  });

  it("omits the Untagged group when every file has at least one tag", () => {
    const groups = groupEntries([file("a.png", ["npc"])], "tag");

    expect(groups.some((group) => group.label === "Untagged")).toBe(false);
  });

  it("omits the Directories group when there are no directories", () => {
    const groups = groupEntries([file("a.png", ["npc"])], "tag");

    expect(groups.some((group) => group.label === "Directories")).toBe(false);
  });

  it("repeats a multi-tagged file in every one of its tag groups", () => {
    const multiTagged = file("a.png", ["npc", "tavern"]);

    const groups = groupEntries([multiTagged], "tag");

    expect(groups.find((group) => group.label === "npc")?.entries).toEqual([multiTagged]);
    expect(groups.find((group) => group.label === "tavern")?.entries).toEqual([multiTagged]);
  });

  it("dedupes a file's own duplicate tags so it only appears once within the same group", () => {
    const duplicateTagged = file("a.png", ["npc", "npc"]);

    const groups = groupEntries([duplicateTagged], "tag");
    const npcGroup = groups.find((group) => group.label === "npc");

    expect(npcGroup?.entries).toEqual([duplicateTagged]);
  });

  it("returns no groups at all for an empty directory grouped by tag", () => {
    expect(groupEntries([], "tag")).toEqual([]);
  });

  it("groups files by type in a fixed Images, Audio, Other order", () => {
    const image = file("a.png");
    const audio = file("b.mp3");
    const other = file("c.pdf");

    const groups = groupEntries([other, audio, image], "type");

    expect(groups.map((group) => group.label)).toEqual(["Images", "Audio", "Other"]);
  });

  it("puts all directories into a Directories group first when grouped by type", () => {
    const entries = [dir("tiles"), file("a.png")];

    const groups = groupEntries(entries, "type");

    expect(groups[0]).toEqual({ label: "Directories", entries: [dir("tiles")] });
  });

  it("omits empty type groups", () => {
    const groups = groupEntries([file("a.png")], "type");

    expect(groups.map((group) => group.label)).toEqual(["Images"]);
  });

  it("omits the Directories group when grouped by type and there are no directories", () => {
    const groups = groupEntries([file("a.png")], "type");

    expect(groups.some((group) => group.label === "Directories")).toBe(false);
  });

  it("returns no groups at all for an empty directory grouped by type", () => {
    expect(groupEntries([], "type")).toEqual([]);
  });
});
