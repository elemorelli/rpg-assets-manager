// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "./Breadcrumbs.tsx";

describe("Breadcrumbs", () => {
  it("renders one crumb per path segment, plus root", () => {
    render(<Breadcrumbs currentPath="tiles/legacy-pack" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "root" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "legacy-pack" })).toBeInTheDocument();
  });

  it("disables the last crumb, since it is the current location", () => {
    render(<Breadcrumbs currentPath="tiles" onNavigate={vi.fn()} />);

    expect(screen.getByRole("button", { name: "tiles" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "root" })).toBeEnabled();
  });

  it("navigates to the clicked crumb's path", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(<Breadcrumbs currentPath="tiles/legacy-pack" onNavigate={onNavigate} />);
    await user.click(screen.getByRole("button", { name: "tiles" }));

    expect(onNavigate).toHaveBeenCalledWith("tiles");
  });
});
