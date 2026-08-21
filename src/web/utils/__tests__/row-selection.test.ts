import { describe, expect, it } from "vitest";

import {
  applySelectionClick,
  initialSelectionState,
  modifierFromClick,
  type SelectionState,
  selectAll,
} from "../row-selection.ts";

const orderedNames = ["a", "b", "c", "d", "e"];

describe("initialSelectionState", () => {
  it("starts empty with no anchor", () => {
    expect(initialSelectionState.selectedNames.size).toBe(0);
    expect(initialSelectionState.anchorName).toBeNull();
  });
});

describe("applySelectionClick", () => {
  it("replace selects only the clicked name and sets it as the anchor", () => {
    const state: SelectionState = { selectedNames: new Set(["a", "b"]), anchorName: "a" };
    const next = applySelectionClick(state, orderedNames, "c", "replace");

    expect([...next.selectedNames]).toEqual(["c"]);
    expect(next.anchorName).toBe("c");
  });

  it("toggle adds a name that was not selected, keeping the rest of the selection", () => {
    const state: SelectionState = { selectedNames: new Set(["a"]), anchorName: "a" };
    const next = applySelectionClick(state, orderedNames, "c", "toggle");

    expect([...next.selectedNames].sort()).toEqual(["a", "c"]);
  });

  it("toggle removes a name that was already selected", () => {
    const state: SelectionState = { selectedNames: new Set(["a", "c"]), anchorName: "a" };
    const next = applySelectionClick(state, orderedNames, "c", "toggle");

    expect([...next.selectedNames]).toEqual(["a"]);
  });

  it("toggle sets the anchor when there wasn't one yet", () => {
    const state: SelectionState = { selectedNames: new Set(), anchorName: null };
    const next = applySelectionClick(state, orderedNames, "c", "toggle");

    expect(next.anchorName).toBe("c");
  });

  it("range selects the contiguous run from the anchor to the clicked name", () => {
    const state: SelectionState = { selectedNames: new Set(["b"]), anchorName: "b" };
    const next = applySelectionClick(state, orderedNames, "d", "range");

    expect([...next.selectedNames].sort()).toEqual(["b", "c", "d"]);
    expect(next.anchorName).toBe("b");
  });

  it("range works when the clicked name comes before the anchor", () => {
    const state: SelectionState = { selectedNames: new Set(["d"]), anchorName: "d" };
    const next = applySelectionClick(state, orderedNames, "b", "range");

    expect([...next.selectedNames].sort()).toEqual(["b", "c", "d"]);
  });

  it("range falls back to selecting just the clicked name when there is no anchor", () => {
    const state: SelectionState = { selectedNames: new Set(), anchorName: null };
    const next = applySelectionClick(state, orderedNames, "c", "range");

    expect([...next.selectedNames]).toEqual(["c"]);
    expect(next.anchorName).toBe("c");
  });
});

describe("selectAll", () => {
  it("selects every name and keeps no anchor", () => {
    const next = selectAll(orderedNames);

    expect([...next.selectedNames].sort()).toEqual(orderedNames);
    expect(next.anchorName).toBeNull();
  });

  it("returns an empty selection when there are no names", () => {
    const next = selectAll([]);

    expect(next.selectedNames.size).toBe(0);
  });
});

describe("modifierFromClick", () => {
  it("returns toggle when ctrlKey or metaKey is pressed", () => {
    expect(modifierFromClick({ ctrlKey: true, metaKey: false, shiftKey: false })).toBe("toggle");
    expect(modifierFromClick({ ctrlKey: false, metaKey: true, shiftKey: false })).toBe("toggle");
  });

  it("returns range when shiftKey is pressed without ctrl or meta", () => {
    expect(modifierFromClick({ ctrlKey: false, metaKey: false, shiftKey: true })).toBe("range");
  });

  it("returns replace when no modifier key is pressed", () => {
    expect(modifierFromClick({ ctrlKey: false, metaKey: false, shiftKey: false })).toBe("replace");
  });
});
