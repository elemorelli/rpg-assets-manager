// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScrollList } from "./scroll-list.tsx";

describe("ScrollList", () => {
  it("renders nothing when there are no rows", () => {
    const { container } = render(<ScrollList rows={[]} />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
  });

  it("renders a row per item, applying the given className", () => {
    render(
      <ScrollList
        rows={[
          { key: "a", label: "a.png -> a.webp", className: "added" },
          { key: "b", label: "b.png -> b.webp" },
        ]}
      />,
    );

    const addedRow = screen.getByText("a.png -> a.webp");
    expect(addedRow).toBeInTheDocument();
    expect(addedRow).toHaveClass("added");
    expect(screen.getByText("b.png -> b.webp")).toBeInTheDocument();
  });
});
