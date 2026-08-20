// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useOverwriteConfirmation } from "../use-overwrite-confirmation.ts";

interface Item {
  displayName: string;
}

describe("useOverwriteConfirmation", () => {
  it("starts with no conflicting items", () => {
    const { result } = renderHook(() => useOverwriteConfirmation<Item>());

    expect(result.current.conflictingFileNames).toBeNull();
  });

  it("exposes the display names of the items passed to askToOverwrite", async () => {
    const { result } = renderHook(() => useOverwriteConfirmation<Item>());

    act(() => {
      void result.current.askToOverwrite([{ displayName: "a.png" }, { displayName: "b.png" }]);
    });

    expect(result.current.conflictingFileNames).toEqual(["a.png", "b.png"]);
  });

  it("resolves the pending decision with true and clears the conflict when confirmed", async () => {
    const { result } = renderHook(() => useOverwriteConfirmation<Item>());
    let decision: Promise<boolean> = Promise.resolve(false);

    act(() => {
      decision = result.current.askToOverwrite([{ displayName: "a.png" }]);
    });
    act(() => {
      result.current.confirmOverwrite();
    });

    expect(await decision).toBe(true);
    expect(result.current.conflictingFileNames).toBeNull();
  });

  it("resolves the pending decision with false and clears the conflict when cancelled", async () => {
    const { result } = renderHook(() => useOverwriteConfirmation<Item>());
    let decision: Promise<boolean> = Promise.resolve(true);

    act(() => {
      decision = result.current.askToOverwrite([{ displayName: "a.png" }]);
    });
    act(() => {
      result.current.cancelOverwrite();
    });

    expect(await decision).toBe(false);
    expect(result.current.conflictingFileNames).toBeNull();
  });
});
