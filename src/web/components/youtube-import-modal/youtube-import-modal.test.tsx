// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";
import * as api from "#web/requests/index.ts";

import { YoutubeImportModal, type YoutubeImportModalProps } from "./youtube-import-modal.tsx";

vi.mock("#web/requests/index.ts");

const fetchMetadataMock = vi.mocked(api.fetchYoutubeMetadata);
const importMock = vi.mocked(api.importFromYoutube);

const VIDEO_URL = "https://www.youtube.com/watch?v=abc123";
const VIDEO_DURATION_SECONDS = 125;
const METADATA = {
  videoId: "abc123",
  title: "Epic Battle Music",
  durationSeconds: VIDEO_DURATION_SECONDS,
  suggestedFileName: "epic-battle-music",
};
const CONFLICT = 409;
const BAD_GATEWAY = 502;
const RETRY_CALL_COUNT = 2;

const renderModal = (overrides: Partial<YoutubeImportModalProps> = {}): YoutubeImportModalProps => {
  const props = {
    currentPath: "music",
    availableTags: ["combat"],
    onClose: vi.fn(),
    onImported: vi.fn(),
    ...overrides,
  };

  render(<YoutubeImportModal {...props} />);

  return props;
};

const fetchDetails = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.type(screen.getByLabelText("YouTube URL"), VIDEO_URL);
  await user.click(screen.getByRole("button", { name: "Fetch" }));
  await screen.findByText("Epic Battle Music");
};

describe("YoutubeImportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMetadataMock.mockResolvedValue(METADATA);
  });

  it("rejects a non-YouTube URL without calling the server", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("YouTube URL"), "https://evil.example/");
    await user.click(screen.getByRole("button", { name: "Fetch" }));

    expect(screen.getByText("Not a YouTube URL")).toBeInTheDocument();
    expect(fetchMetadataMock).not.toHaveBeenCalled();
  });

  it("fetches when Enter is pressed in the URL field", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("YouTube URL"), `${VIDEO_URL}{Enter}`);

    expect(await screen.findByText("Epic Battle Music")).toBeInTheDocument();
  });

  it("shows title, duration and the suggested name after fetching", async () => {
    const user = userEvent.setup();
    renderModal();

    await fetchDetails(user);

    expect(fetchMetadataMock).toHaveBeenCalledWith(VIDEO_URL);
    expect(screen.getByText("2:05")).toBeInTheDocument();
    expect(screen.getByLabelText("File name")).toHaveValue("epic-battle-music");
  });

  it("shows the server error when fetching fails", async () => {
    const user = userEvent.setup();
    fetchMetadataMock.mockRejectedValue(new ApiError("Video unavailable", BAD_GATEWAY));
    renderModal();

    await user.type(screen.getByLabelText("YouTube URL"), VIDEO_URL);
    await user.click(screen.getByRole("button", { name: "Fetch" }));

    expect(await screen.findByText("Video unavailable")).toBeInTheDocument();
  });

  it("imports with the edited name and tags, then closes", async () => {
    const user = userEvent.setup();
    importMock.mockResolvedValue({ imported: "music/battle.ogg" });
    const props = renderModal();

    await fetchDetails(user);
    await user.clear(screen.getByLabelText("File name"));
    await user.type(screen.getByLabelText("File name"), "battle");
    await user.type(screen.getByLabelText("Add tag"), "combat{Enter}");
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(importMock).toHaveBeenCalledWith({
      url: VIDEO_URL,
      directoryPath: "music",
      fileName: "battle",
      tags: ["combat"],
      overwrite: false,
    });
    expect(props.onImported).toHaveBeenCalled();
  });

  it("disables Import while the file name is invalid", async () => {
    const user = userEvent.setup();
    renderModal();

    await fetchDetails(user);
    await user.clear(screen.getByLabelText("File name"));

    expect(screen.getByText("File name is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeDisabled();
  });

  it("asks before overwriting and retries with overwrite on confirmation", async () => {
    const user = userEvent.setup();
    importMock
      .mockRejectedValueOnce(new ApiError("File already exists", CONFLICT))
      .mockResolvedValueOnce({ imported: "music/epic-battle-music.ogg" });
    renderModal();

    await fetchDetails(user);
    await user.click(screen.getByRole("button", { name: "Import" }));
    await user.click(await screen.findByRole("button", { name: "Overwrite" }));

    await waitFor(() => expect(importMock).toHaveBeenCalledTimes(RETRY_CALL_COUNT));
    expect(importMock).toHaveBeenLastCalledWith(expect.objectContaining({ overwrite: true }));
  });

  it("closes without refreshing when the import was cancelled", async () => {
    const user = userEvent.setup();
    importMock.mockResolvedValue({ imported: null });
    const props = renderModal();

    await fetchDetails(user);
    await user.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() => expect(props.onClose).toHaveBeenCalled());
    expect(props.onImported).not.toHaveBeenCalled();
  });
});
