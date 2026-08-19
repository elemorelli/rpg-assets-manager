// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AudioPreviewButton } from "./audio-preview-button.tsx";

const getAudioElement = (): HTMLAudioElement => {
  const audioElement = document.querySelector("audio");

  if (!audioElement) {
    throw new Error("audio element not found");
  }

  return audioElement;
};

describe("AudioPreviewButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a Play button by default, targeting the raw file", () => {
    render(<AudioPreviewButton relativePath="audio/ambient.wav" />);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(getAudioElement()).toHaveAttribute("src", "/api/files/raw?path=audio%2Fambient.wav");
  });

  it("plays the underlying audio element when clicked while paused", async () => {
    const user = userEvent.setup();
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(() => Promise.resolve());

    render(<AudioPreviewButton relativePath="audio/ambient.wav" />);
    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(playSpy).toHaveBeenCalled();
  });

  it("switches to a Pause button once playback starts", () => {
    render(<AudioPreviewButton relativePath="audio/ambient.wav" />);

    fireEvent.play(getAudioElement());

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  });

  it("pauses the underlying audio element when clicked while playing", async () => {
    const user = userEvent.setup();
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    render(<AudioPreviewButton relativePath="audio/ambient.wav" />);
    fireEvent.play(getAudioElement());
    await user.click(screen.getByRole("button", { name: "Pause" }));

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("switches back to a Play button when playback ends", () => {
    render(<AudioPreviewButton relativePath="audio/ambient.wav" />);
    const audioElement = getAudioElement();

    fireEvent.play(audioElement);
    fireEvent.ended(audioElement);

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("pauses a sibling instance's audio element when playback starts", () => {
    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    render(
      <>
        <AudioPreviewButton relativePath="audio/ambient.wav" />
        <AudioPreviewButton relativePath="audio/battle.wav" />
      </>,
    );
    const [firstAudio, secondAudio] = document.querySelectorAll("audio");

    fireEvent.play(firstAudio);
    fireEvent.play(secondAudio);

    expect(pauseSpy).toHaveBeenCalled();
  });
});
