// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import styles from "./button.module.css";
import { Button } from "./button.tsx";

describe("Button", () => {
  it("renders its children", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Save</Button>);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).toHaveBeenCalled();
  });

  it("does not call onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to the secondary variant", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(styles.secondary);
  });

  it("applies the primary variant class when variant is primary", () => {
    render(<Button variant="primary">Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(styles.primary);
  });

  it("applies the danger variant class when variant is danger", () => {
    render(<Button variant="danger">Delete</Button>);

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(styles.danger);
  });

  it("defaults to type=button so it never submits an enclosing form", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("type", "button");
  });

  it("renders as a styled link with the given href when href is provided", () => {
    render(
      <Button variant="secondary" href="/export">
        Download
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Download" });

    expect(link).toHaveAttribute("href", "/export");
    expect(link).toHaveClass(styles.secondary);
  });

  it("opens in a new tab, safely, when newTab is set", () => {
    render(
      <Button href="https://example.com/a.png" newTab>
        Open
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Open" });

    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
