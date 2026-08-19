import { beforeEach, describe, expect, it, vi } from "vitest";

const rcloneCopyMock = vi.fn().mockResolvedValue(undefined);
const rcloneDeleteMock = vi.fn().mockResolvedValue(undefined);
const rcloneMoveToMock = vi.fn().mockResolvedValue(undefined);

vi.mock("#server/rclone/index.ts", () => ({
  rcloneCopy: (...args: unknown[]) => rcloneCopyMock(...args),
  rcloneDelete: (...args: unknown[]) => rcloneDeleteMock(...args),
  rcloneMoveTo: (...args: unknown[]) => rcloneMoveToMock(...args),
}));

const { countRcloneSteps, runRcloneOperations } = await import("../run-rclone-operations.ts");

const emptyDiff = { added: [], modified: [], deleted: [], renamed: [], ambiguousWarnings: [] };

beforeEach(() => {
  rcloneCopyMock.mockReset().mockResolvedValue(undefined);
  rcloneDeleteMock.mockReset().mockResolvedValue(undefined);
  rcloneMoveToMock.mockReset().mockResolvedValue(undefined);
});

describe("countRcloneSteps", () => {
  it("counts zero steps for an empty diff", () => {
    expect(countRcloneSteps(emptyDiff)).toBe(0);
  });

  it("counts one step per added and modified file", () => {
    const twoAddedSteps = 2;
    const oneModifiedStep = 1;
    const expectedSteps = twoAddedSteps + oneModifiedStep;

    expect(countRcloneSteps({ ...emptyDiff, added: ["a.png", "b.png"], modified: ["c.png"] })).toBe(
      expectedSteps,
    );
  });

  it("counts one step per deleted file", () => {
    expect(countRcloneSteps({ ...emptyDiff, deleted: ["a.png", "b.png"] })).toBe(2);
  });

  it("counts one step per rename pair", () => {
    expect(
      countRcloneSteps({
        ...emptyDiff,
        renamed: [
          { oldPath: "a.png", newPath: "a2.png" },
          { oldPath: "b.png", newPath: "b2.png" },
        ],
      }),
    ).toBe(2);
  });

  it("sums copy, delete and rename file counts together", () => {
    const oneAddedStep = 1;
    const oneDeletedStep = 1;
    const oneRenamedStep = 1;
    const expectedSteps = oneAddedStep + oneDeletedStep + oneRenamedStep;

    expect(
      countRcloneSteps({
        added: ["a.png"],
        modified: [],
        deleted: ["b.png"],
        renamed: [{ oldPath: "c.png", newPath: "c2.png" }],
        ambiguousWarnings: [],
      }),
    ).toBe(expectedSteps);
  });
});

describe("runRcloneOperations", () => {
  it("skips copy and delete entirely when there is nothing to copy or delete", async () => {
    await runRcloneOperations("/root", "/dest", emptyDiff);

    expect(rcloneCopyMock).not.toHaveBeenCalled();
    expect(rcloneDeleteMock).not.toHaveBeenCalled();
    expect(rcloneMoveToMock).not.toHaveBeenCalled();
  });

  it("copies added and modified files together in a single rcloneCopy call", async () => {
    await runRcloneOperations("/root", "/dest", {
      ...emptyDiff,
      added: ["a.png"],
      modified: ["b.png"],
    });

    expect(rcloneCopyMock).toHaveBeenCalledTimes(1);
    expect(rcloneCopyMock).toHaveBeenCalledWith(
      "/root",
      "/dest",
      ["a.png", "b.png"],
      expect.any(Function),
    );
  });

  it("runs copy before delete before renames, in that order", async () => {
    const callOrder: string[] = [];

    rcloneCopyMock.mockImplementation(async () => {
      callOrder.push("copy");
    });
    rcloneDeleteMock.mockImplementation(async () => {
      callOrder.push("delete");
    });
    rcloneMoveToMock.mockImplementation(async () => {
      callOrder.push("moveTo");
    });

    await runRcloneOperations("/root", "/dest", {
      added: ["a.png"],
      modified: [],
      deleted: ["b.png"],
      renamed: [{ oldPath: "c.png", newPath: "c2.png" }],
      ambiguousWarnings: [],
    });

    expect(callOrder).toEqual(["copy", "delete", "moveTo"]);
  });

  it("issues one rcloneMoveTo call per rename pair, in order", async () => {
    await runRcloneOperations("/root", "/dest", {
      ...emptyDiff,
      renamed: [
        { oldPath: "a.png", newPath: "a2.png" },
        { oldPath: "b.png", newPath: "b2.png" },
      ],
    });

    expect(rcloneMoveToMock).toHaveBeenNthCalledWith(1, "/dest", "a.png", "a2.png");
    expect(rcloneMoveToMock).toHaveBeenNthCalledWith(2, "/dest", "b.png", "b2.png");
  });

  it("reports per-file progress as rclone reports each copied and deleted file completing", async () => {
    const progressUpdates: { done: number; total: number; detail?: string }[] = [];

    rcloneCopyMock.mockImplementation(
      async (
        _root: string,
        _dest: string,
        files: string[],
        onFileDone: (relativePath: string) => void,
      ) => {
        for (const file of files) {
          onFileDone(file);
        }
      },
    );
    rcloneDeleteMock.mockImplementation(
      async (_dest: string, files: string[], onFileDone: (relativePath: string) => void) => {
        for (const file of files) {
          onFileDone(file);
        }
      },
    );

    await runRcloneOperations(
      "/root",
      "/dest",
      {
        added: ["a.png", "b.png"],
        modified: [],
        deleted: ["c.png"],
        renamed: [{ oldPath: "d.png", newPath: "d2.png" }],
        ambiguousWarnings: [],
      },
      (progress) => progressUpdates.push(progress),
    );

    expect(progressUpdates).toEqual([
      { done: 0, total: 4, detail: "Copying 2 file(s)" },
      { done: 1, total: 4, detail: "a.png" },
      { done: 2, total: 4, detail: "b.png" },
      { done: 2, total: 4, detail: "Deleting 1 file(s)" },
      { done: 3, total: 4, detail: "c.png" },
      { done: 3, total: 4, detail: "Renaming d.png → d2.png" },
      { done: 4, total: 4, detail: "d2.png" },
    ]);
  });

  it("only deletes when there is nothing to copy", async () => {
    await runRcloneOperations("/root", "/dest", { ...emptyDiff, deleted: ["b.png"] });

    expect(rcloneCopyMock).not.toHaveBeenCalled();
    expect(rcloneDeleteMock).toHaveBeenCalledWith("/dest", ["b.png"], expect.any(Function));
  });
});
