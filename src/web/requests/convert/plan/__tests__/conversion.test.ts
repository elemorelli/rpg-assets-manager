import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { fetchConversionPlan } from "../conversion.ts";

describe("fetchConversionPlan", () => {
  it("GETs the conversion plan", async () => {
    const plan = { candidates: [], conflicts: [] };
    const fetchMock = stubFetch(new Response(JSON.stringify(plan)));

    const result = await fetchConversionPlan();

    expect(fetchMock).toHaveBeenCalledWith("/api/convert/plan", undefined);
    expect(result).toEqual(plan);
  });
});
