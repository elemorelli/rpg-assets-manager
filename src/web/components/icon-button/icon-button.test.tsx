// @vitest-environment jsdom
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "./icon-button.tsx";

describe("IconButton", () => {
  it("renders as a button and calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<IconButton icon={faDownload} label="Download" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Download" }));

    expect(onClick).toHaveBeenCalled();
  });

  it("renders as a link with the given href when href is provided", () => {
    render(<IconButton icon={faDownload} label="Download" href="/export" download />);

    const link = screen.getByRole("link", { name: "Download" });

    expect(link).toHaveAttribute("href", "/export");
  });

  it("opens in a new tab, safely, when newTab is set", () => {
    render(<IconButton icon={faDownload} label="Open" href="https://example.com/a.png" newTab />);

    const link = screen.getByRole("link", { name: "Open" });

    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
