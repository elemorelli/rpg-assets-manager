import { EventEmitter } from "node:events";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

const execFileMock = vi.fn();
const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

const { rcloneCheck, rcloneCopy, rcloneDelete, rcloneMoveTo } = await import("../client.ts");

type ExecFileCallback = (
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string,
) => void;

class FakeRcloneProcess extends EventEmitter {
  stderr = new EventEmitter();
}

const queueSpawn = (): FakeRcloneProcess => {
  const child = new FakeRcloneProcess();

  spawnMock.mockReturnValueOnce(child);

  return child;
};

const emitLines = (child: FakeRcloneProcess, lines: string[]): void => {
  child.stderr.emit("data", Buffer.from(`${lines.join("\n")}\n`));
};

const waitForSpawn = (): Promise<void> => vi.waitFor(() => expect(spawnMock).toHaveBeenCalled());

afterEach(() => {
  execFileMock.mockReset();
  spawnMock.mockReset();
});

describe("rcloneCopy", () => {
  it("invokes rclone copy with a --files-from-raw list file containing the relative paths", async () => {
    const child = queueSpawn();
    const promise = rcloneCopy("/source", "/destination", ["tiles/forest.png", "top.png"]);

    await waitForSpawn();
    const [file, args] = spawnMock.mock.calls[0] as [string, string[]];

    expect(file).toBe("rclone");
    expect(args[0]).toBe("copy");
    expect(args[1]).toBe("/source");
    expect(args[2]).toBe("/destination");
    expect(args[3]).toBe("--files-from-raw");
    expect(args[5]).toBe("--s3-no-check-bucket");

    const listFileContent = await fs.readFile(args[4], "utf8");

    expect(listFileContent).toBe("tiles/forest.png\ntop.png");

    child.emit("close", 0);
    await promise;
  });

  it("reports each copied file as rclone logs it", async () => {
    const child = queueSpawn();
    const onFileDone = vi.fn();
    const promise = rcloneCopy("/source", "/destination", ["a.png", "b.png"], onFileDone);

    await waitForSpawn();
    emitLines(child, [
      JSON.stringify({ msg: "Copied (new)", object: "a.png" }),
      JSON.stringify({ msg: "Copied (replaced existing)", object: "b.png" }),
    ]);
    child.emit("close", 0);
    await promise;

    expect(onFileDone).toHaveBeenNthCalledWith(1, "a.png");
    expect(onFileDone).toHaveBeenNthCalledWith(2, "b.png");
  });

  it("rejects when rclone exits with a non-zero code", async () => {
    const child = queueSpawn();
    const promise = rcloneCopy("/source", "/destination", ["a.png"]);

    await waitForSpawn();
    emitLines(child, [JSON.stringify({ level: "error", msg: "disk full" })]);
    child.emit("close", 1);

    await expect(promise).rejects.toThrow(/rclone exited with code 1/);
  });
});

describe("rcloneDelete", () => {
  it("invokes rclone delete with a --files-from-raw list file containing the relative paths", async () => {
    const child = queueSpawn();
    const promise = rcloneDelete("/destination", ["gone.png"]);

    await waitForSpawn();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];

    expect(args.slice(0, 2)).toEqual(["delete", "/destination"]);
    expect(args[4]).toBe("--s3-no-check-bucket");

    const listFileContent = await fs.readFile(args[3], "utf8");

    expect(listFileContent).toBe("gone.png");

    child.emit("close", 0);
    await promise;
  });

  it("reports each deleted file as rclone logs it", async () => {
    const child = queueSpawn();
    const onFileDone = vi.fn();
    const promise = rcloneDelete("/destination", ["gone.png"], onFileDone);

    await waitForSpawn();
    emitLines(child, [JSON.stringify({ msg: "Deleted", object: "gone.png" })]);
    child.emit("close", 0);
    await promise;

    expect(onFileDone).toHaveBeenCalledWith("gone.png");
  });
});

describe("rcloneMoveTo", () => {
  const succeedingExecFile = (onCall?: (file: string, args: string[]) => void) => {
    execFileMock.mockImplementation((file: string, args: string[], callback: ExecFileCallback) => {
      onCall?.(file, args);
      callback(null, "", "");
    });
  };

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
    const child = queueSpawn();
    const promise = rcloneCheck("/source", "/destination");

    await waitForSpawn();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    const reportFilePath = args[4];

    await fs.writeFile(reportFilePath, "= same.png\n");
    child.emit("close", 0);

    const result = await promise;

    expect(result.matchCount).toBe(1);
    expect(result.differs).toEqual([]);
  });

  it("still parses the combined report when rclone exits 1 (differences found)", async () => {
    const child = queueSpawn();
    const promise = rcloneCheck("/source", "/destination");

    await waitForSpawn();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    const reportFilePath = args[4];

    await fs.writeFile(reportFilePath, "* changed.png\n+ new-on-dest.png\n");
    child.emit("close", 1);

    const result = await promise;

    expect(result.differs).toEqual(["changed.png"]);
    expect(result.missingOnDestination).toEqual(["new-on-dest.png"]);
  });

  it("re-throws when rclone exits with a code other than 0 or 1", async () => {
    const child = queueSpawn();
    const promise = rcloneCheck("/source", "/destination");

    await waitForSpawn();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];

    await fs.writeFile(args[4], "");
    emitLines(child, [JSON.stringify({ level: "error", msg: "rclone crashed" })]);
    child.emit("close", 2);

    await expect(promise).rejects.toThrow(/rclone exited with code 2/);
  });

  it("reports checked/total progress from periodic stats lines", async () => {
    const child = queueSpawn();
    const onProgress = vi.fn();
    const promise = rcloneCheck("/source", "/destination", onProgress);

    await waitForSpawn();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];

    emitLines(child, [
      JSON.stringify({ msg: "stats update", stats: { checks: 5, totalChecks: 20 } }),
    ]);
    await fs.writeFile(args[4], "= same.png\n");
    child.emit("close", 0);
    await promise;

    expect(onProgress).toHaveBeenCalledWith({ done: 5, total: 20 });
  });
});
