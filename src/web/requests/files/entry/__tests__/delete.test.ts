import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { deleteEntry } from "../delete.ts";

describe("deleteEntry", () => {
  it("sends a DELETE with a JSON body", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ deleted: true })));

    await deleteEntry("tiles/old.png");

    expect(fetchMock).toHaveBeenCalledWith("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "tiles/old.png" }),
    });
  });
});
