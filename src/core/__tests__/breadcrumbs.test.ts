import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "../breadcrumbs.ts";

describe("buildBreadcrumbs", () => {
  it("returns only the root crumb for the tree root", () => {
    expect(buildBreadcrumbs("")).toEqual([{ name: "root", path: "" }]);
  });

  it("adds one crumb per path segment, with cumulative paths", () => {
    expect(buildBreadcrumbs("tiles/legacy-pack")).toEqual([
      { name: "root", path: "" },
      { name: "tiles", path: "tiles" },
      { name: "legacy-pack", path: "tiles/legacy-pack" },
    ]);
  });

  it("ignores a trailing slash", () => {
    expect(buildBreadcrumbs("tiles/")).toEqual([
      { name: "root", path: "" },
      { name: "tiles", path: "tiles" },
    ]);
  });
});
