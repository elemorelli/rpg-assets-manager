import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { convert } from "../assets.ts";

describe("convert", () => {
  it("POSTs to /api/convert", async () => {
    const summary = { converted: 3, conflicts: 1 };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    const result = await convert();

    expect(fetchMock).toHaveBeenCalledWith("/api/convert", { method: "POST" });
    expect(result).toEqual(summary);
  });
});
