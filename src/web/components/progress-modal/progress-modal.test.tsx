// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgressModal } from "./progress-modal.tsx";

describe("ProgressModal", () => {
  it("renders a progress bar with the done/total counts", () => {
    render(<ProgressModal title="Uploading files" done={3} total={10} onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Uploading files" })).toBeInTheDocument();
    expect(screen.getByText("3 / 10")).toBeInTheDocument();
    expect(screen.queryByTestId("progress-modal-spinner")).not.toBeInTheDocument();
  });

  it("renders an indeterminate spinner when the total is unknown", () => {
    render(<ProgressModal title="Checking" done={0} total={0} onClose={vi.fn()} />);

    expect(screen.getByTestId("progress-modal-spinner")).toBeInTheDocument();
  });

  it("shows the detail text when given one", () => {
    render(
      <ProgressModal title="Uploading files" done={1} total={2} detail="a.png" onClose={vi.fn()} />,
    );

    expect(screen.getByText("a.png")).toBeInTheDocument();
  });

  it("shows the ETA when given one", () => {
    const fortySeconds = 40;

    render(
      <ProgressModal
        title="Uploading files"
        done={1}
        total={2}
        etaSeconds={fortySeconds}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("ETA: 40s")).toBeInTheDocument();
  });

  it("is not dismissible by default", () => {
    render(<ProgressModal title="Uploading files" done={1} total={2} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });
});
