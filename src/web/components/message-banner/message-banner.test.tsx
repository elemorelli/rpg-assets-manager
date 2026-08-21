// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Message } from "#web/utils/message.ts";

import { MessageBanner } from "./message-banner.tsx";

describe("MessageBanner", () => {
  it("renders the summary for an error message", () => {
    const message: Message = { severity: "error", summary: "disk full" };

    render(<MessageBanner message={message} />);

    expect(screen.getByText("disk full")).toBeInTheDocument();
  });

  it("renders the summary for a warning message without a details list", () => {
    const message: Message = { severity: "warning", summary: "Skipped 1 file(s)" };

    render(<MessageBanner message={message} />);

    expect(screen.getByText("Skipped 1 file(s)")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders each detail when the message carries details", () => {
    const message: Message = {
      severity: "warning",
      summary: "Skipped 2 file(s) that already exist",
      details: ["existing.png", "map.png"],
    };

    render(<MessageBanner message={message} />);

    expect(screen.getByText("existing.png")).toBeInTheDocument();
    expect(screen.getByText("map.png")).toBeInTheDocument();
  });
});
