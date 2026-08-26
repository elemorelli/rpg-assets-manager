// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DirectoryTableSkeleton } from "./directory-table-skeleton.tsx";

describe("DirectoryTableSkeleton", () => {
  it("renders a busy placeholder table with no real entries", () => {
    render(<DirectoryTableSkeleton />);

    const table = screen.getByRole("table", { name: "Loading directory contents" });

    expect(table).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
