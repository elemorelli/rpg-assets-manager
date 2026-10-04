import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "#server/db/index.ts";
import { HTTP_STATUS } from "#server/errors/index.ts";
import { buildTestApp } from "#server/test-utils/build-test-app.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";
import { loginTestSession } from "#server/test-utils/login-test-session.ts";
import type { JobProgress } from "#utils/job.ts";

import { importYoutubeAudio } from "../import.ts";

const FAKE_YTDLP_PATH = path.join(import.meta.dirname, "../../../ytdlp/__tests__/fake-yt-dlp.sh");
const VIDEO_URL = "https://www.youtube.com/watch?v=abc123";
const PREFIX = "youtube-import-test/";
const OGG_MAGIC_START = 0;
const OGG_MAGIC_END = 4;

const readMagic = async (absolutePath: string): Promise<string> => {
  const content = await fs.readFile(absolutePath);

  return content.subarray(OGG_MAGIC_START, OGG_MAGIC_END).toString("ascii");
};

describe("YouTube import (requires DATABASE_URL, ffmpeg; yt-dlp is faked)", () => {
  const tempDir = useTempDir("youtube-import-tree-");
  const workRoot = useTempDir("youtube-import-work-");

  cleanupAssetsByPrefix(PREFIX, ["assets", "directories"]);
  destroyDbAfterAll();

  beforeEach(() => {
    vi.stubEnv("YTDLP_PATH", FAKE_YTDLP_PATH);
    vi.stubEnv("FAKE_YTDLP_MODE", "success");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("downloads, converts and registers the asset with its tags", async () => {
    const stages: string[] = [];

    const result = await importYoutubeAudio(
      tempDir.path,
      workRoot.path,
      {
        url: VIDEO_URL,
        relativePath: `${PREFIX}battle.ogg`,
        tags: ["combat"],
        overwrite: false,
      },
      (progress: JobProgress) => {
        if (progress.stage && !stages.includes(progress.stage)) {
          stages.push(progress.stage);
        }
      },
      new AbortController().signal,
    );

    expect(result).toEqual({ imported: `${PREFIX}battle.ogg` });
    expect(await readMagic(path.join(tempDir.path, PREFIX, "battle.ogg"))).toBe("OggS");

    const row = await db
      .selectFrom("assets")
      .select(["tags", "hash"])
      .where("path", "=", `${PREFIX}battle.ogg`)
      .executeTakeFirstOrThrow();

    expect(row.tags).toEqual(["combat"]);
    expect(row.hash).not.toBe("");
    expect(stages).toEqual(["downloading", "converting", "registering"]);
    expect(await fs.readdir(workRoot.path)).toEqual([]);
  });

  it("leaves nothing behind when cancelled mid-download", async () => {
    vi.stubEnv("FAKE_YTDLP_MODE", "hang");
    const controller = new AbortController();

    const result = await importYoutubeAudio(
      tempDir.path,
      workRoot.path,
      { url: VIDEO_URL, relativePath: `${PREFIX}battle.ogg`, tags: [], overwrite: false },
      (progress) => {
        if (progress.done > 0) {
          controller.abort();
        }
      },
      controller.signal,
    );

    expect(result).toEqual({ imported: null });
    expect(await fs.readdir(workRoot.path)).toEqual([]);
    await expect(fs.stat(path.join(tempDir.path, PREFIX, "battle.ogg"))).rejects.toThrow();

    const row = await db
      .selectFrom("assets")
      .select("id")
      .where("path", "=", `${PREFIX}battle.ogg`)
      .executeTakeFirst();

    expect(row).toBeUndefined();
  });

  it("serves metadata over HTTP and rejects non-YouTube URLs", async () => {
    const app = buildTestApp(tempDir);
    const cookie = await loginTestSession(app);

    const ok = await app.inject({
      method: "GET",
      url: `/api/youtube/metadata?url=${encodeURIComponent(VIDEO_URL)}`,
      headers: { cookie },
    });
    const rejected = await app.inject({
      method: "GET",
      url: `/api/youtube/metadata?url=${encodeURIComponent("https://evil.example/")}`,
      headers: { cookie },
    });

    expect(ok.json()).toMatchObject({ videoId: "abc123", suggestedFileName: "epic-battle-music" });
    expect(rejected.statusCode).toBe(HTTP_STATUS.badRequest);

    await app.close();
  });

  it("answers 409 before downloading when the file exists and overwrite is off", async () => {
    const app = buildTestApp(tempDir);
    const cookie = await loginTestSession(app);

    await fs.mkdir(path.join(tempDir.path, PREFIX), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, PREFIX, "battle.ogg"), "existing");
    vi.stubEnv("FAKE_YTDLP_MODE", "error");

    const response = await app.inject({
      method: "POST",
      url: "/api/youtube/import",
      headers: { cookie },
      payload: {
        url: VIDEO_URL,
        directoryPath: PREFIX,
        fileName: "battle",
        tags: [],
        overwrite: false,
      },
    });

    expect(response.statusCode).toBe(HTTP_STATUS.conflict);

    await app.close();
  });

  it("imports over HTTP and overwrites when asked", async () => {
    const app = buildTestApp(tempDir);
    const cookie = await loginTestSession(app);

    await fs.mkdir(path.join(tempDir.path, PREFIX), { recursive: true });
    await fs.writeFile(path.join(tempDir.path, PREFIX, "battle.ogg"), "existing");

    const response = await app.inject({
      method: "POST",
      url: "/api/youtube/import",
      headers: { cookie },
      payload: {
        url: VIDEO_URL,
        directoryPath: PREFIX,
        fileName: "battle",
        tags: ["Epic"],
        overwrite: true,
      },
    });

    expect(response.json()).toEqual({ imported: `${PREFIX}battle.ogg` });
    expect(await readMagic(path.join(tempDir.path, PREFIX, "battle.ogg"))).toBe("OggS");

    await app.close();
  });
});
