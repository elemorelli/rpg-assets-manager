import { describe, expect, it } from "vitest";

import { runBatchOperation } from "../run-batch-operation.ts";

describe("runBatchOperation", () => {
  it("runs the operation for every item and reports no error on full success", async () => {
    const processed: string[] = [];

    const result = await runBatchOperation(
      ["a", "b", "c"],
      async (item) => {
        processed.push(item);
      },
      (item) => item,
      "Moved",
    );

    expect(processed).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ successCount: 3, errorMessage: null });
  });

  it("stops on the first failure and builds an error message with the progress made", async () => {
    const processed: string[] = [];

    const result = await runBatchOperation(
      ["a", "b", "c"],
      async (item) => {
        if (item === "b") {
          throw new Error("disk full");
        }

        processed.push(item);
      },
      (item) => item,
      "Moved",
    );

    expect(processed).toEqual(["a"]);
    expect(result).toEqual({
      successCount: 1,
      errorMessage: 'Moved 1 of 3 before failing on "b": disk full',
    });
  });

  it("does not run any remaining items after the failure", async () => {
    const processed: string[] = [];

    await runBatchOperation(
      ["a", "b", "c"],
      async (item) => {
        if (item === "a") {
          throw new Error("boom");
        }

        processed.push(item);
      },
      (item) => item,
      "Uploaded",
    );

    expect(processed).toEqual([]);
  });
});
