import { afterEach, describe, expect, it, vi } from "vitest";
import { parseFoundryWorldNames } from "../config.ts";

describe("parseFoundryWorldNames", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an empty array when unset", () => {
    expect(parseFoundryWorldNames(undefined)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseFoundryWorldNames("")).toEqual([]);
  });

  it("splits a comma-separated list and trims each name", () => {
    expect(parseFoundryWorldNames("kingmaker, stolen-fate")).toEqual(["kingmaker", "stolen-fate"]);
  });

  it("drops empty entries from stray commas", () => {
    expect(parseFoundryWorldNames("kingmaker,,stolen-fate,")).toEqual(["kingmaker", "stolen-fate"]);
  });
});
