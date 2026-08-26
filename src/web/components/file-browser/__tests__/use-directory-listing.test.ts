// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";

import { useDirectoryListing } from "../use-directory-listing.ts";

vi.mock("#web/requests/index.ts");

const listDirectoryMock = vi.mocked(api.listDirectory);

const entry = (name: string): DirectoryEntry => ({ name, type: "file" });

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

describe("useDirectoryListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears stale entries as soon as the path changes, before the new listing resolves", async () => {
    const firstLoad = deferred<DirectoryEntry[]>();
    const secondLoad = deferred<DirectoryEntry[]>();

    listDirectoryMock.mockReturnValueOnce(firstLoad.promise);

    const { result, rerender } = renderHook(({ path }) => useDirectoryListing(path), {
      initialProps: { path: "folder-a" },
    });

    firstLoad.resolve([entry("old-file.png")]);
    await waitFor(() => expect(result.current.entries).toEqual([entry("old-file.png")]));

    listDirectoryMock.mockReturnValueOnce(secondLoad.promise);
    rerender({ path: "folder-b" });

    expect(result.current.entries).toEqual([]);

    secondLoad.resolve([entry("new-file.png")]);
    await waitFor(() => expect(result.current.entries).toEqual([entry("new-file.png")]));
  });

  it("keeps stale entries visible while a same-path refresh is in flight", async () => {
    const firstLoad = deferred<DirectoryEntry[]>();
    const refreshLoad = deferred<DirectoryEntry[]>();

    listDirectoryMock.mockReturnValueOnce(firstLoad.promise);

    const { result } = renderHook(() => useDirectoryListing("folder-a"));

    firstLoad.resolve([entry("existing-file.png")]);
    await waitFor(() => expect(result.current.entries).toEqual([entry("existing-file.png")]));

    listDirectoryMock.mockReturnValueOnce(refreshLoad.promise);
    act(() => {
      void result.current.refreshAfterMutation("folder-a");
    });

    expect(result.current.entries).toEqual([entry("existing-file.png")]);

    refreshLoad.resolve([entry("existing-file.png"), entry("new-file.png")]);
    await waitFor(() =>
      expect(result.current.entries).toEqual([entry("existing-file.png"), entry("new-file.png")]),
    );
  });
});
