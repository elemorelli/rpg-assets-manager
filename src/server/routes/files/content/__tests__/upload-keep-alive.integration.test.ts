import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { db } from "#server/db/index.ts";
import { HTTP_STATUS } from "#server/errors/index.ts";
import { buildTestApp } from "#server/test-utils/build-test-app.ts";
import {
  cleanupAssetsByPrefix,
  destroyDbAfterAll,
  useTempDir,
} from "#server/test-utils/integration-lifecycle.ts";
import { loginTestSession } from "#server/test-utils/login-test-session.ts";

const PREFIX = "upload-keep-alive-test/";
const LARGE_UNREAD_BODY_BYTES = 2_000_000;
const HANG_TIMEOUT_MS = 10_000;

// Real sockets only: app.inject() (light-my-request) dispatches directly into
// Fastify's router without going through Node's HTTP parser or a reused
// keep-alive TCP connection, so it cannot reproduce a bug that only shows up
// when a later request reuses a connection left in a bad state by an earlier
// one.
describe("upload keep-alive connection handling (requires DATABASE_URL and a real socket)", () => {
  const tempDir = useTempDir("upload-keep-alive-");

  cleanupAssetsByPrefix(PREFIX, ["assets", "directories"]);
  destroyDbAfterAll();

  it(
    "does not hang a later upload on the same connection after an earlier one conflicts",
    async () => {
      await fs.mkdir(path.join(tempDir.path, "upload-keep-alive-test"), { recursive: true });
      await fs.writeFile(
        path.join(tempDir.path, "upload-keep-alive-test", "existing.ogg"),
        "original-bytes",
      );

      const app = buildTestApp(tempDir);

      await app.listen({ port: 0, host: "127.0.0.1" });

      const address = app.server.address();

      if (address === null || typeof address === "string") {
        throw new Error("expected a real TCP address from app.listen()");
      }

      const baseUrl = `http://127.0.0.1:${address.port}`;
      const sessionCookie = await loginTestSession(app);

      const upload = (fileName: string, content: string): Promise<Response> => {
        const form = new FormData();

        form.set("path", "upload-keep-alive-test");
        form.set("overwrite", "false");
        form.set("file", new Blob([content]), fileName);

        return fetch(`${baseUrl}/api/files/upload`, {
          method: "POST",
          headers: { cookie: sessionCookie },
          body: form,
        });
      };

      try {
        // Conflicts with the pre-existing file. The request body carries far
        // more bytes than the server needs to read to know it's a conflict,
        // so a handler that responds without draining the rest of this
        // request's body leaves the connection mis-framed for reuse.
        const conflictResponse = await upload("existing.ogg", "x".repeat(LARGE_UNREAD_BODY_BYTES));

        expect(conflictResponse.status).toBe(HTTP_STATUS.conflict);

        // A brand new file, sent right after: on a corrupted connection this
        // hangs instead of ever resolving.
        const nextResponse = await upload("brand-new.ogg", "new-bytes");

        expect(nextResponse.status).toBe(HTTP_STATUS.ok);
      } finally {
        await app.close();
      }
    },
    HANG_TIMEOUT_MS,
  );
});
