import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getConversionPlan } from "../plan.ts";

describe("getConversionPlan", () => {
  let tempDir = "";

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = "";
    }
  });

  it("walks the tree and returns conversion candidates", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "convert-plan-test-"));
    await fs.mkdir(path.join(tempDir, "tiles"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "tiles", "forest.png"), "fake-png-bytes");

    const plan = await getConversionPlan(tempDir);

    expect(plan.candidates).toEqual([
      {
        relativePath: "tiles/forest.png",
        kind: "image",
        destinationPath: "tiles/forest.webp",
        willOverwrite: false,
      },
    ]);
  });
});
