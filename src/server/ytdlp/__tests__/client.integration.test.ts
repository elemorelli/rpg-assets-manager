import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "#server/errors/index.ts";
import { useTempDir } from "#server/test-utils/integration-lifecycle.ts";
import type { JobProgress } from "#utils/job.ts";

import { downloadYoutubeAudio, fetchYoutubeMetadata } from "../index.ts";

const FAKE_YTDLP_PATH = path.join(import.meta.dirname, "fake-yt-dlp.sh");
const VIDEO_URL = "https://www.youtube.com/watch?v=abc123";
const SHORT_TIMEOUT_MS = 200;
const BAD_GATEWAY = 502;
const GATEWAY_TIMEOUT = 504;
const VIDEO_DURATION_SECONDS = 125;
const PARTIAL_BYTES = 250;
const TOTAL_BYTES = 1000;

describe("yt-dlp client (fake binary, no network)", () => {
  const tempDir = useTempDir("ytdlp-client-");

  beforeEach(() => {
    vi.stubEnv("YTDLP_PATH", FAKE_YTDLP_PATH);
    vi.stubEnv("FAKE_YTDLP_MODE", "success");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fetches and parses metadata", async () => {
    const metadata = await fetchYoutubeMetadata(VIDEO_URL);

    expect(metadata).toEqual({
      videoId: "abc123",
      title: "Epic Battle Music!",
      durationSeconds: VIDEO_DURATION_SECONDS,
      suggestedFileName: "epic-battle-music",
    });
  });

  it("maps a yt-dlp failure to a 502 carrying the ERROR line", async () => {
    vi.stubEnv("FAKE_YTDLP_MODE", "error");

    await expect(fetchYoutubeMetadata(VIDEO_URL)).rejects.toMatchObject({
      message: "[youtube] abc123: Video unavailable",
      statusCode: BAD_GATEWAY,
    });
  });

  it("maps a metadata timeout to a 504", async () => {
    vi.stubEnv("FAKE_YTDLP_MODE", "hang");

    await expect(fetchYoutubeMetadata(VIDEO_URL, SHORT_TIMEOUT_MS)).rejects.toMatchObject({
      message: "Timed out fetching video info",
      statusCode: GATEWAY_TIMEOUT,
    });
  });

  it("reports a missing binary clearly", async () => {
    vi.stubEnv("YTDLP_PATH", path.join(tempDir.path, "does-not-exist"));

    const failure = await fetchYoutubeMetadata(VIDEO_URL).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(HttpError);
    expect(failure).toMatchObject({ message: "yt-dlp is not installed", statusCode: BAD_GATEWAY });
  });

  it("downloads into the directory and reports byte progress", async () => {
    const progressUpdates: JobProgress[] = [];

    const downloadedPath = await downloadYoutubeAudio(
      VIDEO_URL,
      tempDir.path,
      (progress) => progressUpdates.push(progress),
      new AbortController().signal,
    );

    expect(path.dirname(downloadedPath)).toBe(tempDir.path);
    expect((await fs.stat(downloadedPath)).size).toBeGreaterThan(0);
    expect(progressUpdates).toEqual([
      { done: PARTIAL_BYTES, total: TOTAL_BYTES },
      { done: TOTAL_BYTES, total: TOTAL_BYTES },
    ]);
  });

  it("rejects with the ERROR line when the download fails", async () => {
    vi.stubEnv("FAKE_YTDLP_MODE", "error");

    await expect(
      downloadYoutubeAudio(VIDEO_URL, tempDir.path, () => {}, new AbortController().signal),
    ).rejects.toMatchObject({ message: "[youtube] abc123: Video unavailable" });
  });

  it("kills the process and rejects when aborted", async () => {
    vi.stubEnv("FAKE_YTDLP_MODE", "hang");
    const controller = new AbortController();

    const download = downloadYoutubeAudio(
      VIDEO_URL,
      tempDir.path,
      () => controller.abort(),
      controller.signal,
    );

    await expect(download).rejects.toThrow();
    expect(await fs.readdir(tempDir.path)).toEqual([]);
  });
});
