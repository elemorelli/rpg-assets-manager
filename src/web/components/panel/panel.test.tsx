// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import styles from "./panel.module.css";
import { Panel } from "./panel.tsx";

describe("Panel", () => {
  it("renders its children", () => {
    render(<Panel>Content</Panel>);

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("does not apply the elevated class by default", () => {
    render(<Panel>Content</Panel>);

    expect(screen.getByText("Content")).not.toHaveClass(styles.elevated);
  });

  it("applies the elevated class when elevated is true", () => {
    render(<Panel elevated>Content</Panel>);

    expect(screen.getByText("Content")).toHaveClass(styles.elevated);
  });

  it("applies a custom className alongside the base panel class", () => {
    render(<Panel className="custom">Content</Panel>);

    expect(screen.getByText("Content")).toHaveClass(styles.panel, "custom");
  });

  it("forwards extra div props such as role and aria-label", () => {
    render(
      <Panel role="dialog" aria-label="Example">
        Content
      </Panel>,
    );

    expect(screen.getByRole("dialog", { name: "Example" })).toBeInTheDocument();
  });

  it("forwards a ref to the underlying div", () => {
    const ref = createRef<HTMLDivElement>();

    render(<Panel ref={ref}>Content</Panel>);

    expect(ref.current).toBe(screen.getByText("Content"));
  });
});
