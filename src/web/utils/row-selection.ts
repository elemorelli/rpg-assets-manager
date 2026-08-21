export interface SelectionState {
  selectedNames: Set<string>;
  anchorName: string | null;
}

export type SelectionClickModifier = "replace" | "toggle" | "range";

export const initialSelectionState: SelectionState = {
  selectedNames: new Set(),
  anchorName: null,
};

export const selectAll = (orderedNames: string[]): SelectionState => ({
  selectedNames: new Set(orderedNames),
  anchorName: null,
});

const applyReplace = (clickedName: string): SelectionState => ({
  selectedNames: new Set([clickedName]),
  anchorName: clickedName,
});

const applyToggle = (state: SelectionState, clickedName: string): SelectionState => {
  const nextSelectedNames = new Set(state.selectedNames);

  if (nextSelectedNames.has(clickedName)) {
    nextSelectedNames.delete(clickedName);
  } else {
    nextSelectedNames.add(clickedName);
  }

  return { selectedNames: nextSelectedNames, anchorName: state.anchorName ?? clickedName };
};

const applyRange = (
  state: SelectionState,
  orderedNames: string[],
  clickedName: string,
): SelectionState => {
  const anchorName = state.anchorName ?? clickedName;
  const anchorIndex = orderedNames.indexOf(anchorName);
  const clickedIndex = orderedNames.indexOf(clickedName);

  if (anchorIndex === -1 || clickedIndex === -1) {
    return applyReplace(clickedName);
  }

  const startIndex = Math.min(anchorIndex, clickedIndex);
  const endIndex = Math.max(anchorIndex, clickedIndex);
  const rangeNames = orderedNames.slice(startIndex, endIndex + 1);

  return { selectedNames: new Set(rangeNames), anchorName };
};

export const applySelectionClick = (
  state: SelectionState,
  orderedNames: string[],
  clickedName: string,
  modifier: SelectionClickModifier,
): SelectionState => {
  if (modifier === "replace") {
    return applyReplace(clickedName);
  }

  if (modifier === "toggle") {
    return applyToggle(state, clickedName);
  }

  return applyRange(state, orderedNames, clickedName);
};

export interface ClickModifierKeys {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export const modifierFromClick = (event: ClickModifierKeys): SelectionClickModifier => {
  if (event.ctrlKey || event.metaKey) {
    return "toggle";
  }

  if (event.shiftKey) {
    return "range";
  }

  return "replace";
};
