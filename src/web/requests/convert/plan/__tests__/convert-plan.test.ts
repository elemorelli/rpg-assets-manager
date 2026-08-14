import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchConversionPlan } from "../convert-plan.ts";

describe("fetchConversionPlan", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs the conversion plan", async () => {
    const plan = { candidates: [], conflicts: [] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(plan)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchConversionPlan();

    expect(fetchMock).toHaveBeenCalledWith("/api/convert/plan", undefined);
    expect(result).toEqual(plan);
  });
});
