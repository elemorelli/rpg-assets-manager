// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBox } from "./SearchBox.tsx";

const DEBOUNCE_MS = 300;
const BEFORE_DEBOUNCE_MS = 200;
const REMAINING_AFTER_RESET_MS = 100;

describe("SearchBox", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls onSearch with the query after the debounce window", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "forest" } });
    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(onSearch).toHaveBeenCalledWith("forest");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it("resets the debounce timer on each keystroke instead of firing per keystroke", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} />);
    const input = screen.getByRole("searchbox");

    fireEvent.change(input, { target: { value: "fo" } });
    vi.advanceTimersByTime(BEFORE_DEBOUNCE_MS);
    fireEvent.change(input, { target: { value: "forest" } });
    vi.advanceTimersByTime(BEFORE_DEBOUNCE_MS);

    expect(onSearch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(REMAINING_AFTER_RESET_MS);

    expect(onSearch).toHaveBeenCalledWith("forest");
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
