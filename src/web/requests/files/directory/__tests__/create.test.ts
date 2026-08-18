import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { createDirectory } from "../create.ts";

describe("createDirectory", () => {
  it("POSTs a JSON body with the path", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ created: true })));

    await createDirectory("tiles/new-pack");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/mkdir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/new-pack" }),
    });
  });
});
