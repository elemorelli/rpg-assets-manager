// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PanelDrawer } from "./panel-drawer.tsx";

const renderWithExpandTrigger = (expandTrigger: number | undefined) =>
  render(
    <PanelDrawer expandTrigger={expandTrigger}>
      <p>Job progress</p>
    </PanelDrawer>,
  );

describe("PanelDrawer", () => {
  it("starts collapsed, hiding its children", () => {
    render(
      <PanelDrawer>
        <p>Job progress</p>
      </PanelDrawer>,
    );

    expect(screen.queryByText("Job progress")).not.toBeInTheDocument();
  });

  it("shows its children after the toggle is clicked", async () => {
    const user = userEvent.setup();

    render(
      <PanelDrawer>
        <p>Job progress</p>
      </PanelDrawer>,
    );
    await user.click(screen.getByRole("button", { name: "Show panels" }));

    expect(screen.getByText("Job progress")).toBeInTheDocument();
  });

  it("hides its children again after a second toggle click", async () => {
    const user = userEvent.setup();

    render(
      <PanelDrawer>
        <p>Job progress</p>
      </PanelDrawer>,
    );
    await user.click(screen.getByRole("button", { name: "Show panels" }));
    await user.click(screen.getByRole("button", { name: "Hide panels" }));

    expect(screen.queryByText("Job progress")).not.toBeInTheDocument();
  });

  it("stays collapsed on initial mount even when expandTrigger is already defined", () => {
    renderWithExpandTrigger(1);

    expect(screen.queryByText("Job progress")).not.toBeInTheDocument();
  });

  it("expands when expandTrigger changes to a new value", () => {
    const { rerender } = renderWithExpandTrigger(undefined);
    rerender(
      <PanelDrawer expandTrigger={1}>
        <p>Job progress</p>
      </PanelDrawer>,
    );

    expect(screen.getByText("Job progress")).toBeInTheDocument();
  });

  it("does not re-force itself open after the user collapses it again", async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithExpandTrigger(undefined);
    rerender(
      <PanelDrawer expandTrigger={1}>
        <p>Job progress</p>
      </PanelDrawer>,
    );
    await user.click(screen.getByRole("button", { name: "Hide panels" }));

    rerender(
      <PanelDrawer expandTrigger={1}>
        <p>Job progress</p>
      </PanelDrawer>,
    );

    expect(screen.queryByText("Job progress")).not.toBeInTheDocument();
  });
});
