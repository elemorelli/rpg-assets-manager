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
  rcloneCopyMock.mockClear();
  rcloneDeleteMock.mockClear();
  rcloneMoveToMock.mockClear();
});

describe("countRcloneSteps", () => {
  it("counts zero steps for an empty diff", () => {
    expect(countRcloneSteps(emptyDiff)).toBe(0);
  });

  it("counts one step for added and modified combined, regardless of how many files", () => {
    expect(countRcloneSteps({ ...emptyDiff, added: ["a.png", "b.png"], modified: ["c.png"] })).toBe(
      1,
    );
  });

  it("counts one step for any number of deletions", () => {
    expect(countRcloneSteps({ ...emptyDiff, deleted: ["a.png", "b.png"] })).toBe(1);
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

  it("sums copy, delete and rename steps together", () => {
    const oneCopyStep = 1;
    const oneDeleteStep = 1;
    const oneRenameStep = 1;
    const expectedTotalSteps = oneCopyStep + oneDeleteStep + oneRenameStep;

    expect(
      countRcloneSteps({
        added: ["a.png"],
        modified: [],
        deleted: ["b.png"],
        renamed: [{ oldPath: "c.png", newPath: "c2.png" }],
        ambiguousWarnings: [],
      }),
    ).toBe(expectedTotalSteps);
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
    expect(rcloneCopyMock).toHaveBeenCalledWith("/root", "/dest", ["a.png", "b.png"]);
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

  it("reports cumulative progress across copy, delete and each rename", async () => {
    const progressUpdates: { done: number; total: number; detail?: string }[] = [];

    await runRcloneOperations(
      "/root",
      "/dest",
      {
        added: ["a.png"],
        modified: [],
        deleted: ["b.png"],
        renamed: [{ oldPath: "c.png", newPath: "c2.png" }],
        ambiguousWarnings: [],
      },
      (progress) => progressUpdates.push(progress),
    );

    expect(progressUpdates).toEqual([
      { done: 0, total: 3, detail: "Copying 1 file(s)" },
      { done: 1, total: 3 },
      { done: 1, total: 3, detail: "Deleting 1 file(s)" },
      { done: 2, total: 3 },
      { done: 2, total: 3, detail: "Renaming c.png → c2.png" },
      { done: 3, total: 3 },
    ]);
  });

  it("only deletes when there is nothing to copy", async () => {
    await runRcloneOperations("/root", "/dest", { ...emptyDiff, deleted: ["b.png"] });

    expect(rcloneCopyMock).not.toHaveBeenCalled();
    expect(rcloneDeleteMock).toHaveBeenCalledWith("/dest", ["b.png"]);
  });
});
