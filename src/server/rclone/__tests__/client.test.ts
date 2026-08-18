import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

const { rcloneCheck, rcloneCopy, rcloneDelete, rcloneMoveTo } = await import("../client.ts");

type ExecFileCallback = (
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string,
) => void;

const succeedingExecFile = (onCall?: (file: string, args: string[]) => void) => {
  execFileMock.mockImplementation((file: string, args: string[], callback: ExecFileCallback) => {
    onCall?.(file, args);
    callback(null, "", "");
  });
};

afterEach(() => {
  execFileMock.mockReset();
});

describe("rcloneCopy", () => {
  it("invokes rclone copy with a --files-from-raw list file containing the relative paths", async () => {
    let capturedArgs: string[] = [];

    succeedingExecFile((_file, args) => {
      capturedArgs = args;
    });

    await rcloneCopy("/source", "/destination", ["tiles/forest.png", "top.png"]);

    expect(capturedArgs[0]).toBe("copy");
    expect(capturedArgs[1]).toBe("/source");
    expect(capturedArgs[2]).toBe("/destination");
    expect(capturedArgs[3]).toBe("--files-from-raw");
    expect(capturedArgs[5]).toBe("--s3-no-check-bucket");

    const listFileContent = await fs.readFile(capturedArgs[4], "utf8");

    expect(listFileContent).toBe("tiles/forest.png\ntop.png");
  });
});

describe("rcloneDelete", () => {
  it("invokes rclone delete with a --files-from-raw list file containing the relative paths", async () => {
    let capturedArgs: string[] = [];

    succeedingExecFile((_file, args) => {
      capturedArgs = args;
    });

    await rcloneDelete("/destination", ["gone.png"]);

    expect(capturedArgs.slice(0, 2)).toEqual(["delete", "/destination"]);
    expect(capturedArgs[4]).toBe("--s3-no-check-bucket");

    const listFileContent = await fs.readFile(capturedArgs[3], "utf8");

    expect(listFileContent).toBe("gone.png");
  });
});

describe("rcloneMoveTo", () => {
  it("invokes rclone moveto with the old and new paths joined under the destination root", async () => {
    let capturedArgs: string[] = [];

    succeedingExecFile((_file, args) => {
      capturedArgs = args;
    });

    await rcloneMoveTo("/destination", "old/name.png", "new/name.png");

    expect(capturedArgs).toEqual([
      "moveto",
      "/destination/old/name.png",
      "/destination/new/name.png",
      "--s3-no-check-bucket",
    ]);
  });
});

describe("rcloneCheck", () => {
  it("parses the combined report when rclone exits 0 (no differences)", async () => {
    execFileMock.mockImplementation(
      async (_file: string, args: string[], callback: ExecFileCallback) => {
        const reportFilePath = args[4];

        await fs.writeFile(reportFilePath, "= same.png\n");
        callback(null, "", "");
      },
    );

    const result = await rcloneCheck("/source", "/destination");

    expect(result.matchCount).toBe(1);
    expect(result.differs).toEqual([]);
  });

  it("still parses the combined report when rclone exits 1 (differences found)", async () => {
    execFileMock.mockImplementation(
      async (_file: string, args: string[], callback: ExecFileCallback) => {
        const reportFilePath = args[4];

        await fs.writeFile(reportFilePath, "* changed.png\n+ new-on-dest.png\n");

        const error = Object.assign(new Error("rclone check found differences"), { code: 1 });

        callback(error, "", "");
      },
    );

    const result = await rcloneCheck("/source", "/destination");

    expect(result.differs).toEqual(["changed.png"]);
    expect(result.missingOnDestination).toEqual(["new-on-dest.png"]);
  });

  it("re-throws when rclone exits with a code other than 0 or 1", async () => {
    execFileMock.mockImplementation(
      (_file: string, _args: string[], callback: ExecFileCallback) => {
        const error = Object.assign(new Error("rclone crashed"), { code: 2 });

        callback(error, "", "");
      },
    );

    await expect(rcloneCheck("/source", "/destination")).rejects.toThrow("rclone crashed");
  });
});
