// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SearchResultEntry } from "../../requests/files/entry/search.ts";
import { SearchResults } from "./SearchResults.tsx";

describe("SearchResults", () => {
  it("renders one entry per result and forwards clicks", async () => {
    const user = userEvent.setup();
    const onOpenResult = vi.fn();
    const results: SearchResultEntry[] = [
      { relativePath: "tiles/forest.png", type: "file" },
      { relativePath: "tiles/forest", type: "directory" },
    ];

    render(<SearchResults results={results} onOpenResult={onOpenResult} />);
    await user.click(screen.getByRole("button", { name: "tiles/forest.png" }));

    expect(onOpenResult).toHaveBeenCalledWith(results[0]);
  });

  it("renders nothing when there are no results", () => {
    render(<SearchResults results={[]} onOpenResult={vi.fn()} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
