// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DirectoryGridSkeleton } from "./directory-grid-skeleton.tsx";

describe("DirectoryGridSkeleton", () => {
  it("renders a busy placeholder grid with no real entries", () => {
    render(<DirectoryGridSkeleton />);

    const grid = screen.getByLabelText("Loading directory contents");

    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
