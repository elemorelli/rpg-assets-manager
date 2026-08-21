// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { ConvertModal } from "./convert-modal.tsx";

vi.mock("#web/requests/index.ts");

const fetchConversionPlanMock = vi.mocked(api.fetchConversionPlan);
const convertMock = vi.mocked(api.convert);

describe("ConvertModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the plan for the current directory as soon as it opens", () => {
    fetchConversionPlanMock.mockResolvedValue({ candidates: [] });

    render(<ConvertModal currentPath="tiles" onClose={vi.fn()} onConverted={vi.fn()} />);

    expect(fetchConversionPlanMock).toHaveBeenCalledWith("tiles", "folder");
  });

  it("refetches the plan for the newly selected scope when it changes", async () => {
    const user = userEvent.setup();
    fetchConversionPlanMock.mockResolvedValue({ candidates: [] });

    render(<ConvertModal currentPath="tiles" onClose={vi.fn()} onConverted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "All folders" }));

    expect(fetchConversionPlanMock).toHaveBeenLastCalledWith("tiles", "all");
  });

  it("shows a colored list of candidates", async () => {
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        {
          relativePath: "forest.png",
          kind: "image",
          destinationPath: "forest.webp",
          willOverwrite: false,
        },
        {
          relativePath: "theme.wav",
          kind: "audio",
          destinationPath: "theme.ogg",
          willOverwrite: true,
        },
      ],
    });

    render(<ConvertModal currentPath="tiles" onClose={vi.fn()} onConverted={vi.fn()} />);

    expect(await screen.findByText("2 file(s) to convert:")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convert 2 file(s)" })).toBeInTheDocument();
    expect(screen.getByText("forest.png -> forest.webp")).toBeInTheDocument();
    expect(screen.getByText("theme.wav -> theme.ogg")).toBeInTheDocument();
  });

  it("shows a message when there is nothing to convert", async () => {
    fetchConversionPlanMock.mockResolvedValue({ candidates: [] });

    render(<ConvertModal currentPath="tiles" onClose={vi.fn()} onConverted={vi.fn()} />);

    expect(await screen.findByText("Nothing to convert.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Convert \d/ })).not.toBeInTheDocument();
  });

  it("converts, then notifies the parent and closes", async () => {
    const user = userEvent.setup();
    const onConverted = vi.fn();
    const onClose = vi.fn();
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        {
          relativePath: "forest.png",
          kind: "image",
          destinationPath: "forest.webp",
          willOverwrite: false,
        },
      ],
    });
    convertMock.mockResolvedValue({ converted: 1, overwritten: 0 });

    render(<ConvertModal currentPath="tiles" onClose={onClose} onConverted={onConverted} />);
    await screen.findByText("1 file(s) to convert:");
    await user.click(screen.getByRole("button", { name: "Convert 1 file(s)" }));

    await waitFor(() => {
      expect(convertMock).toHaveBeenCalledWith("tiles", "folder");
    });
    expect(onConverted).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("closes without converting when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        {
          relativePath: "forest.png",
          kind: "image",
          destinationPath: "forest.webp",
          willOverwrite: false,
        },
      ],
    });

    render(<ConvertModal currentPath="tiles" onClose={onClose} onConverted={vi.fn()} />);
    await screen.findByText("1 file(s) to convert:");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(convertMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows an error and stays open when conversion fails", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        {
          relativePath: "forest.png",
          kind: "image",
          destinationPath: "forest.webp",
          willOverwrite: false,
        },
      ],
    });
    convertMock.mockRejectedValue(new Error("disk full"));

    render(<ConvertModal currentPath="tiles" onClose={onClose} onConverted={vi.fn()} />);
    await screen.findByText("1 file(s) to convert:");
    await user.click(screen.getByRole("button", { name: "Convert 1 file(s)" }));

    expect(await screen.findByText("disk full")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
