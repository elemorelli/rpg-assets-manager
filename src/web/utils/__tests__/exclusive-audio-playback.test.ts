// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { claimExclusivePlayback } from "../exclusive-audio-playback.ts";

describe("claimExclusivePlayback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not error when no element has claimed playback yet", () => {
    const audio = document.createElement("audio");

    expect(() => claimExclusivePlayback(audio)).not.toThrow();
  });

  it("pauses the previously claiming audio element when a different one claims playback", () => {
    const first = document.createElement("audio");
    const second = document.createElement("audio");
    const pauseSpy = vi.spyOn(first, "pause");

    claimExclusivePlayback(first);
    claimExclusivePlayback(second);

    expect(pauseSpy).toHaveBeenCalled();
  });

  it("does not pause the same element when it claims playback again", () => {
    const audio = document.createElement("audio");
    const pauseSpy = vi.spyOn(audio, "pause");

    claimExclusivePlayback(audio);
    claimExclusivePlayback(audio);

    expect(pauseSpy).not.toHaveBeenCalled();
  });
});
