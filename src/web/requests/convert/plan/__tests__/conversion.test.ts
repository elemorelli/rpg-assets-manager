import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchConversionPlan } from "../conversion.ts";

describe("fetchConversionPlan", () => {
  it("GETs the conversion plan for the given path and scope", async () => {
    const plan = { candidates: [] };
    const fetchMock = stubFetch(new Response(JSON.stringify(plan)));

    const result = await fetchConversionPlan("tiles", "subtree");

    expect(fetchMock).toHaveBeenCalledWith("/api/convert/plan?path=tiles&scope=subtree", undefined);
    expect(result).toEqual(plan);
  });
});
