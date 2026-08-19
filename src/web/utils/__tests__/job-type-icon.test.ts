import { faArrowsRotate, faCloudArrowUp, faScaleBalanced } from "@fortawesome/free-solid-svg-icons";
import { describe, expect, it } from "vitest";

import { iconForJobType } from "#web/utils/job-type-icon.ts";

describe("iconForJobType", () => {
  it("maps rescan to the toolbar rescan icon", () => {
    expect(iconForJobType("rescan")).toBe(faArrowsRotate);
  });

  it("maps sync to the toolbar sync icon", () => {
    expect(iconForJobType("sync")).toBe(faCloudArrowUp);
  });

  it("maps reconcile to the toolbar reconcile icon", () => {
    expect(iconForJobType("reconcile")).toBe(faScaleBalanced);
  });

  it("returns undefined for a job type with no matching toolbar icon", () => {
    expect(iconForJobType("convert")).toBeUndefined();
  });
});
