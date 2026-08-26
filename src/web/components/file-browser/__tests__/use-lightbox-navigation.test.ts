// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";

import { useLightboxNavigation } from "../use-lightbox-navigation.ts";

const entries: DirectoryEntry[] = [
  { name: "a.png", type: "file" },
  { name: "b.png", type: "file" },
  { name: "c.png", type: "file" },
];

const setup = (deepLinkedFileName: string | null) => {
  const navigateToPath = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();

  const { result } = renderHook(() =>
    useLightboxNavigation({
      directoryPath: "handouts",
      deepLinkedFileName,
      previewableEntries: entries,
      navigateToPath,
      onRename,
      onDelete,
    }),
  );

  return { result, navigateToPath, onRename, onDelete };
};

describe("useLightboxNavigation", () => {
  it("has no open entry when nothing is deep-linked", () => {
    const { result } = setup(null);

    expect(result.current.lightboxEntry).toBeNull();
    expect(result.current.lightboxIndex).toBe(-1);
  });

  it("derives the open entry from the deep-linked file name", () => {
    const { result } = setup("b.png");

    expect(result.current.lightboxEntry).toEqual(entries[1]);
    expect(result.current.lightboxIndex).toBe(1);
  });

  it("has no open entry when the deep-linked name matches nothing (not loaded yet, or stale)", () => {
    const { result } = setup("missing.png");

    expect(result.current.lightboxEntry).toBeNull();
    expect(result.current.lightboxIndex).toBe(-1);
  });

  it("opening navigates to the entry's file url under the current directory", () => {
    const { result, navigateToPath } = setup(null);

    result.current.handleOpenLightbox(entries[0]);

    expect(navigateToPath).toHaveBeenCalledWith("handouts/a.png");
  });

  it("closing navigates back to the plain directory url", () => {
    const { result, navigateToPath } = setup("a.png");

    result.current.handleCloseLightbox();

    expect(navigateToPath).toHaveBeenCalledWith("handouts");
  });

  it("prev/next navigate to the neighboring entry", () => {
    const { result, navigateToPath } = setup("b.png");

    result.current.handleLightboxPrev();
    expect(navigateToPath).toHaveBeenCalledWith("handouts/a.png");

    result.current.handleLightboxNext();
    expect(navigateToPath).toHaveBeenCalledWith("handouts/c.png");
  });

  it("prev is a no-op at the first entry, next is a no-op at the last", () => {
    const first = setup("a.png");
    first.result.current.handleLightboxPrev();
    expect(first.navigateToPath).not.toHaveBeenCalled();

    const last = setup("c.png");
    last.result.current.handleLightboxNext();
    expect(last.navigateToPath).not.toHaveBeenCalled();
  });

  it("renaming calls onRename and navigates to the new name's url", () => {
    const { result, navigateToPath, onRename } = setup("a.png");

    result.current.handleLightboxRename(entries[0], "renamed.png");

    expect(onRename).toHaveBeenCalledWith(entries[0], "renamed.png");
    expect(navigateToPath).toHaveBeenCalledWith("handouts/renamed.png");
  });

  it("deleting calls onDelete and navigates to the next entry as a fallback", () => {
    const { result, navigateToPath, onDelete } = setup("b.png");

    result.current.handleLightboxDelete(entries[1]);

    expect(onDelete).toHaveBeenCalledWith(entries[1]);
    expect(navigateToPath).toHaveBeenCalledWith("handouts/c.png");
  });

  it("deleting the last entry falls back to the previous one", () => {
    const { result, navigateToPath } = setup("c.png");

    result.current.handleLightboxDelete(entries[2]);

    expect(navigateToPath).toHaveBeenCalledWith("handouts/b.png");
  });

  it("deleting the only entry navigates back to the plain directory url", () => {
    const navigateToPath = vi.fn();
    const { result } = renderHook(() =>
      useLightboxNavigation({
        directoryPath: "handouts",
        deepLinkedFileName: "only.png",
        previewableEntries: [{ name: "only.png", type: "file" }],
        navigateToPath,
        onRename: vi.fn(),
        onDelete: vi.fn(),
      }),
    );

    result.current.handleLightboxDelete({ name: "only.png", type: "file" });

    expect(navigateToPath).toHaveBeenCalledWith("handouts");
  });
});
