// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Breadcrumbs } from "./breadcrumbs.tsx";

describe("Breadcrumbs", () => {
  it("renders one crumb per path segment, plus root", () => {
    render(
      <Breadcrumbs
        currentPath="tiles/legacy-pack"
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "root" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "tiles" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "legacy-pack" })).toBeInTheDocument();
  });

  it("disables the last crumb, since it is the current location", () => {
    render(
      <Breadcrumbs
        currentPath="tiles"
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "tiles" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "root" })).toBeEnabled();
  });

  it("navigates to the clicked crumb's path", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <Breadcrumbs
        currentPath="tiles/legacy-pack"
        onNavigate={onNavigate}
        canDropOnPath={() => false}
        onDropEntry={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "tiles" }));

    expect(onNavigate).toHaveBeenCalledWith("tiles");
  });

  it("calls onDropEntry with the crumb's path when a valid target receives a drop", () => {
    const onDropEntry = vi.fn();

    render(
      <Breadcrumbs
        currentPath="tiles/legacy-pack"
        onNavigate={vi.fn()}
        canDropOnPath={(path) => path === "tiles"}
        onDropEntry={onDropEntry}
      />,
    );
    const crumb = screen.getByRole("button", { name: "tiles" });

    fireEvent.dragOver(crumb);
    fireEvent.drop(crumb);

    expect(onDropEntry).toHaveBeenCalledWith("tiles");
  });

  it("does not call onDropEntry when canDropOnPath rejects the crumb", () => {
    const onDropEntry = vi.fn();

    render(
      <Breadcrumbs
        currentPath="tiles/legacy-pack"
        onNavigate={vi.fn()}
        canDropOnPath={() => false}
        onDropEntry={onDropEntry}
      />,
    );
    const crumb = screen.getByRole("button", { name: "root" });

    fireEvent.dragOver(crumb);
    fireEvent.drop(crumb);

    expect(onDropEntry).not.toHaveBeenCalled();
  });
});
