// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DirectoryEntry } from "#utils/directory-listing.ts";
import * as api from "#web/requests/index.ts";
import { __resetAppConfigCacheForTests } from "#web/utils/use-app-config.ts";

import { Lightbox } from "./lightbox.tsx";

vi.mock("#web/requests/index.ts");

const fetchAppConfigMock = vi.mocked(api.fetchAppConfig);

const imageEntry: DirectoryEntry = { name: "map.png", type: "file", size: 1024, tags: [] };
const audioEntry: DirectoryEntry = { name: "ambient.wav", type: "file", size: 1024, tags: [] };

const baseProps = {
  relativePath: "tiles/map.png",
  hasPrev: true,
  hasNext: true,
  onPrev: vi.fn(),
  onNext: vi.fn(),
  onClose: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  availableTags: [] as string[],
  onTagsChange: vi.fn(),
};

describe("Lightbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAppConfigCacheForTests();
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an image for an image entry", () => {
    render(<Lightbox {...baseProps} entry={imageEntry} />);

    expect(screen.getByRole("img", { name: "map.png" })).toHaveAttribute(
      "src",
      "/api/files/raw?path=tiles%2Fmap.png",
    );
  });

  it("renders an audio player for an audio entry", () => {
    render(<Lightbox {...baseProps} entry={audioEntry} relativePath="audio/ambient.wav" />);

    expect(document.querySelector("audio")).toHaveAttribute(
      "src",
      "/api/files/raw?path=audio%2Fambient.wav",
    );
  });

  it("autoplays the audio entry when it is opened", () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());

    render(<Lightbox {...baseProps} entry={audioEntry} relativePath="audio/ambient.wav" />);

    expect(playSpy).toHaveBeenCalled();
  });

  it("autoplays again when navigating to a different audio entry", () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());
    const nextAudioEntry: DirectoryEntry = {
      name: "battle.wav",
      type: "file",
      size: 1024,
      tags: [],
    };

    const { rerender } = render(
      <Lightbox {...baseProps} entry={audioEntry} relativePath="audio/ambient.wav" />,
    );

    playSpy.mockClear();
    rerender(<Lightbox {...baseProps} entry={nextAudioEntry} relativePath="audio/battle.wav" />);

    expect(playSpy).toHaveBeenCalled();
  });

  it("disables Previous/Next per hasPrev/hasNext", () => {
    render(<Lightbox {...baseProps} entry={imageEntry} hasPrev={false} hasNext={false} />);

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("calls onPrev/onNext when the nav buttons are clicked", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onPrev={onPrev} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onClose={onClose} />);
    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("closes when clicking the backdrop but not when clicking the content", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onClose={onClose} />);
    await user.click(screen.getByRole("img", { name: "map.png" }));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByTestId("lightbox-backdrop"));
    expect(onClose).toHaveBeenCalled();
  });

  it("navigates with ArrowLeft/ArrowRight", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onPrev={onPrev} onNext={onNext} />);
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowLeft}");

    expect(onNext).toHaveBeenCalled();
    expect(onPrev).toHaveBeenCalled();
  });

  it("does not navigate or close via keyboard while typing in the rename input", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onNext = vi.fn();

    render(<Lightbox {...baseProps} entry={imageEntry} onClose={onClose} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: "Rename" }));
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Escape}");

    expect(onNext).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
