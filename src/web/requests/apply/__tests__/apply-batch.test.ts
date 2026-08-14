import { afterEach, describe, expect, it, vi } from "vitest";
import { applyBatch } from "../apply-batch.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("applyBatch", () => {
  it("POSTs to /api/apply and returns the parsed summary", async () => {
    const summary = {
      added: 1,
      modified: 0,
      deleted: 0,
      renamed: 0,
      outcome: "applied",
      syncRunId: 1,
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(summary),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await applyBatch();

    expect(fetchMock).toHaveBeenCalledWith("/api/apply", { method: "POST" });
    expect(result).toEqual(summary);
  });
});
