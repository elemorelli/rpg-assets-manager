import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { convert } from "../assets.ts";

describe("convert", () => {
  it("POSTs to /api/convert with the given path and scope", async () => {
    const summary = { converted: 3, overwritten: 1 };
    const fetchMock = stubFetch(new Response(JSON.stringify(summary)));

    const result = await convert("tiles", "subtree");

    expect(fetchMock).toHaveBeenCalledWith("/api/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles", scope: "subtree" }),
    });
    expect(result).toEqual(summary);
  });
});
