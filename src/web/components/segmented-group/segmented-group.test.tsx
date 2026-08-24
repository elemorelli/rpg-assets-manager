// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedButton } from "./segmented-button.tsx";
import styles from "./segmented-group.module.css";
import { SegmentedGroup } from "./segmented-group.tsx";

describe("SegmentedGroup", () => {
  it("renders its children", () => {
    render(
      <SegmentedGroup aria-label="Options">
        <SegmentedButton>One</SegmentedButton>
      </SegmentedGroup>,
    );

    expect(screen.getByRole("button", { name: "One" })).toBeInTheDocument();
  });

  it("exposes the group role and label", () => {
    render(
      <SegmentedGroup aria-label="Options">
        <SegmentedButton>One</SegmentedButton>
      </SegmentedGroup>,
    );

    expect(screen.getByRole("group", { name: "Options" })).toBeInTheDocument();
  });

  it("applies a custom className alongside the base group class", () => {
    render(
      <SegmentedGroup aria-label="Options" className="custom">
        <SegmentedButton>One</SegmentedButton>
      </SegmentedGroup>,
    );

    expect(screen.getByRole("group", { name: "Options" })).toHaveClass(styles.group, "custom");
  });
});

describe("SegmentedButton", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<SegmentedButton onClick={onClick}>One</SegmentedButton>);
    await user.click(screen.getByRole("button", { name: "One" }));

    expect(onClick).toHaveBeenCalled();
  });

  it("does not set aria-pressed when active is not provided", () => {
    render(<SegmentedButton>One</SegmentedButton>);

    expect(screen.getByRole("button", { name: "One" })).not.toHaveAttribute("aria-pressed");
  });

  it("sets aria-pressed and the active class when active is true", () => {
    render(<SegmentedButton active>One</SegmentedButton>);
    const button = screen.getByRole("button", { name: "One" });

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveClass(styles.active);
  });

  it("sets aria-pressed to false and omits the active class when active is false", () => {
    render(<SegmentedButton active={false}>One</SegmentedButton>);
    const button = screen.getByRole("button", { name: "One" });

    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).not.toHaveClass(styles.active);
  });
});
