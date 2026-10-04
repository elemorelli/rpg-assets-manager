import { describe, expect, it } from "vitest";

import {
  extractYtdlpErrorMessage,
  isAllowedYoutubeUrl,
  normalizeImportFileName,
  parseYtdlpMetadata,
  parseYtdlpProgressLine,
  suggestFileName,
  validateImportFileName,
  YTDLP_PROGRESS_PREFIX,
} from "../youtube-import.ts";

const VIDEO_DURATION_SECONDS = 125;
const LIVE_DURATION_SECONDS = 10;
const CAP_LENGTH = 79;

describe("isAllowedYoutubeUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=abc123",
    "https://youtube.com/watch?v=abc123",
    "https://m.youtube.com/watch?v=abc123",
    "https://music.youtube.com/watch?v=abc123",
    "https://youtu.be/abc123",
  ])("accepts %s", (url) => {
    expect(isAllowedYoutubeUrl(url)).toBe(true);
  });

  it.each([
    "http://www.youtube.com/watch?v=abc123",
    "https://www.youtube.com.evil.example/watch?v=abc123",
    "https://evil.example/?u=https://youtube.com",
    "--exec=rm",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isAllowedYoutubeUrl(url)).toBe(false);
  });
});

describe("suggestFileName", () => {
  it("turns a title into lowercase kebab-case", () => {
    expect(suggestFileName("Epic Battle Music!", "abc123")).toBe("epic-battle-music");
  });

  it("strips accents instead of dropping the letter", () => {
    expect(suggestFileName("Canción del Dragón", "abc123")).toBe("cancion-del-dragon");
  });

  it("collapses runs of separators and trims edge dashes", () => {
    expect(suggestFileName("  --Tavern ~~ Ambience--  ", "abc123")).toBe("tavern-ambience");
  });

  it("falls back to the given id when nothing usable is left", () => {
    expect(suggestFileName("戦闘のテーマ 🎵", "abc123")).toBe("abc123");
  });

  it("caps very long titles without leaving a trailing dash", () => {
    const longTitle = `${"a".repeat(CAP_LENGTH)} bbbb`;

    expect(suggestFileName(longTitle, "abc123")).toBe("a".repeat(CAP_LENGTH));
  });
});

describe("normalizeImportFileName", () => {
  it("trims whitespace", () => {
    expect(normalizeImportFileName("  battle  ")).toBe("battle");
  });

  it("drops a typed .ogg extension, case-insensitively", () => {
    expect(normalizeImportFileName("battle.OGG")).toBe("battle");
  });

  it("keeps other dots in the name", () => {
    expect(normalizeImportFileName("battle.v2")).toBe("battle.v2");
  });
});

describe("validateImportFileName", () => {
  it("accepts a plain name", () => {
    expect(validateImportFileName("epic-battle")).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(validateImportFileName("")).toBe("File name is required");
  });

  it.each(["a/b", "a\\b"])("rejects %s because it has a slash", (name) => {
    expect(validateImportFileName(name)).toBe("File name cannot contain slashes");
  });

  it.each([".", "..", ".hidden"])("rejects %s because it starts with a dot", (name) => {
    expect(validateImportFileName(name)).toBe("File name cannot start with a dot");
  });
});

describe("parseYtdlpProgressLine", () => {
  it("parses downloaded and total bytes", () => {
    expect(parseYtdlpProgressLine(`${YTDLP_PROGRESS_PREFIX}250/1000`)).toEqual({
      done: 250,
      total: 1000,
    });
  });

  it("rounds fractional estimates", () => {
    expect(parseYtdlpProgressLine(`${YTDLP_PROGRESS_PREFIX}250.4/999.6`)).toEqual({
      done: 250,
      total: 1000,
    });
  });

  it("ignores lines where the total is unknown", () => {
    expect(parseYtdlpProgressLine(`${YTDLP_PROGRESS_PREFIX}250/NA`)).toBeUndefined();
  });

  it("ignores regular yt-dlp output", () => {
    expect(parseYtdlpProgressLine("[youtube] abc123: Downloading webpage")).toBeUndefined();
  });
});

describe("parseYtdlpMetadata", () => {
  it("picks id, title and duration and suggests a file name", () => {
    expect(
      parseYtdlpMetadata({
        id: "abc123",
        title: "Epic Battle",
        duration: VIDEO_DURATION_SECONDS,
        is_live: false,
      }),
    ).toEqual({
      videoId: "abc123",
      title: "Epic Battle",
      durationSeconds: VIDEO_DURATION_SECONDS,
      suggestedFileName: "epic-battle",
    });
  });

  it("rejects live streams", () => {
    expect(() =>
      parseYtdlpMetadata({
        id: "abc123",
        title: "Live",
        duration: LIVE_DURATION_SECONDS,
        is_live: true,
      }),
    ).toThrow("Live streams cannot be imported");
  });

  it("rejects output without a duration", () => {
    expect(() => parseYtdlpMetadata({ id: "abc123", title: "Odd" })).toThrow(
      "Video has no duration",
    );
  });

  it("rejects output without an id or title", () => {
    expect(() => parseYtdlpMetadata({ duration: LIVE_DURATION_SECONDS })).toThrow(
      "Unreadable video info",
    );
  });
});

describe("extractYtdlpErrorMessage", () => {
  it("returns the last ERROR line without its prefix", () => {
    const stderr = [
      "WARNING: something minor",
      "ERROR: first failure",
      "ERROR: [youtube] abc123: Video unavailable",
      "",
    ].join("\n");

    expect(extractYtdlpErrorMessage(stderr)).toBe("[youtube] abc123: Video unavailable");
  });

  it("falls back to a generic message", () => {
    expect(extractYtdlpErrorMessage("WARNING: only warnings")).toBe("yt-dlp failed");
  });
});
