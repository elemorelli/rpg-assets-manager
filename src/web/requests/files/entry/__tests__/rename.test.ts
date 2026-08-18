import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { renameEntry } from "../rename.ts";

describe("renameEntry", () => {
  it("POSTs the path and the new name", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ renamed: true })));

    await renameEntry("tiles/old.png", "new.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png", newName: "new.png" }),
    });
  });
});
