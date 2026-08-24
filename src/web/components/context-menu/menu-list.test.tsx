// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MenuItem } from "./menu-item.tsx";
import styles from "./menu-list.module.css";
import { MenuList } from "./menu-list.tsx";

describe("MenuList", () => {
  it("renders its children", () => {
    render(
      <MenuList>
        <MenuItem>Rename</MenuItem>
      </MenuList>,
    );

    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
  });

  it("applies a custom className alongside the base list class", () => {
    render(
      <MenuList className="custom">
        <MenuItem>Rename</MenuItem>
      </MenuList>,
    );

    expect(screen.getByRole("button", { name: "Rename" }).parentElement).toHaveClass(
      styles.list,
      "custom",
    );
  });
});

describe("MenuItem", () => {
  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<MenuItem onClick={onClick}>Rename</MenuItem>);
    await user.click(screen.getByRole("button", { name: "Rename" }));

    expect(onClick).toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits an enclosing form", () => {
    render(<MenuItem>Rename</MenuItem>);

    expect(screen.getByRole("button", { name: "Rename" })).toHaveAttribute("type", "button");
  });
});
