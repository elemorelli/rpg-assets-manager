import { describe, expect, it, vi } from "vitest";

import type { SyncStatus } from "../build-sync-status.ts";
import { createSyncStatusStore, EMPTY_SYNC_STATUS } from "../sync-status-store.ts";

const statusWithAdded = (added: number): SyncStatus => ({ ...EMPTY_SYNC_STATUS, added });

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });

  return { promise, resolve };
};

describe("createSyncStatusStore", () => {
  it("starts with an empty status", () => {
    const store = createSyncStatusStore(vi.fn());

    expect(store.get()).toEqual(EMPTY_SYNC_STATUS);
  });

  it("ignores refreshes until tracking starts", async () => {
    const computeStatus = vi.fn().mockResolvedValue(statusWithAdded(1));
    const store = createSyncStatusStore(computeStatus);

    await store.refresh();

    expect(computeStatus).not.toHaveBeenCalled();
    expect(store.get()).toEqual(EMPTY_SYNC_STATUS);
  });

  it("computes the status once when tracking starts", async () => {
    const computeStatus = vi.fn().mockResolvedValue(statusWithAdded(1));
    const store = createSyncStatusStore(computeStatus);

    await store.start();

    expect(computeStatus).toHaveBeenCalledTimes(1);
    expect(store.get()).toEqual(statusWithAdded(1));
  });

  it("replaces the status on each refresh after starting", async () => {
    const computeStatus = vi
      .fn()
      .mockResolvedValueOnce(statusWithAdded(1))
      .mockResolvedValueOnce(statusWithAdded(2));
    const store = createSyncStatusStore(computeStatus);

    await store.start();
    await store.refresh();

    expect(store.get()).toEqual(statusWithAdded(2));
  });

  it("keeps the newest status when an older refresh finishes last", async () => {
    const olderResult = createDeferred<SyncStatus>();
    const newerResult = createDeferred<SyncStatus>();
    const computeStatus = vi
      .fn()
      .mockResolvedValueOnce(EMPTY_SYNC_STATUS)
      .mockReturnValueOnce(olderResult.promise)
      .mockReturnValueOnce(newerResult.promise);
    const store = createSyncStatusStore(computeStatus);

    await store.start();
    const olderRefresh = store.refresh();
    const newerRefresh = store.refresh();

    newerResult.resolve(statusWithAdded(2));
    await newerRefresh;
    olderResult.resolve(statusWithAdded(1));
    await olderRefresh;

    expect(store.get()).toEqual(statusWithAdded(2));
  });

  it("keeps the previous status when a refresh fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const computeStatus = vi
      .fn()
      .mockResolvedValueOnce(statusWithAdded(1))
      .mockRejectedValueOnce(new Error("db down"));
    const store = createSyncStatusStore(computeStatus);

    try {
      await store.start();
      await store.refresh();

      expect(store.get()).toEqual(statusWithAdded(1));
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
