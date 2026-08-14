// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#web/requests/index.ts";
import { ConversionPanel } from "./conversion-panel.tsx";

vi.mock("../../requests/index.ts");

const fetchConversionPlanMock = vi.mocked(api.fetchConversionPlan);
const convertMock = vi.mocked(api.convert);

describe("ConversionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fetch a plan until the user asks for one", () => {
    render(<ConversionPanel onConverted={vi.fn()} />);

    expect(fetchConversionPlanMock).not.toHaveBeenCalled();
  });

  it("shows candidates and conflicts after checking", async () => {
    const user = userEvent.setup();
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        { relativePath: "tiles/forest.png", kind: "image", destinationPath: "tiles/forest.webp" },
      ],
      conflicts: [
        { relativePath: "audio/theme.wav", kind: "audio", destinationPath: "audio/theme.ogg" },
      ],
    });

    render(<ConversionPanel onConverted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Check for conversions" }));

    expect(await screen.findByText("tiles/forest.png -> tiles/forest.webp")).toBeInTheDocument();
    expect(screen.getByText("audio/theme.wav -> audio/theme.ogg")).toBeInTheDocument();
  });

  it("shows a message when there is nothing to convert", async () => {
    const user = userEvent.setup();
    fetchConversionPlanMock.mockResolvedValue({ candidates: [], conflicts: [] });

    render(<ConversionPanel onConverted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Check for conversions" }));

    expect(await screen.findByText("Nothing to convert.")).toBeInTheDocument();
  });

  it("converts and notifies the parent on success", async () => {
    const user = userEvent.setup();
    const onConverted = vi.fn();
    fetchConversionPlanMock.mockResolvedValue({
      candidates: [
        { relativePath: "tiles/forest.png", kind: "image", destinationPath: "tiles/forest.webp" },
      ],
      conflicts: [],
    });
    convertMock.mockResolvedValue({ converted: 1, conflicts: 0 });

    render(<ConversionPanel onConverted={onConverted} />);
    await user.click(screen.getByRole("button", { name: "Check for conversions" }));
    await screen.findByText("tiles/forest.png -> tiles/forest.webp");
    await user.click(screen.getByRole("button", { name: "Convert 1 file(s)" }));

    await waitFor(() => {
      expect(convertMock).toHaveBeenCalled();
    });
    expect(onConverted).toHaveBeenCalled();
    expect(screen.queryByText("tiles/forest.png -> tiles/forest.webp")).not.toBeInTheDocument();
  });
});
