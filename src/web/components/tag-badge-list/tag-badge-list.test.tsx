// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TagBadgeList } from "./tag-badge-list.tsx";

describe("TagBadgeList", () => {
  it("renders one chip per tag", () => {
    render(<TagBadgeList tags={["npc", "loot"]} />);

    expect(screen.getByText("npc")).toBeInTheDocument();
    expect(screen.getByText("loot")).toBeInTheDocument();
  });

  it("renders no chips when there are no tags", () => {
    const { container } = render(<TagBadgeList tags={[]} />);

    expect(container.querySelectorAll("span")).toHaveLength(0);
  });
});
