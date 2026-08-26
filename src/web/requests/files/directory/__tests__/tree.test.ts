import { describe, expect, it } from "vitest";

import { ApiError } from "#web/requests/http-client.ts";
import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { getDirectoryTree } from "../tree.ts";

describe("getDirectoryTree", () => {
  it("GETs the tree endpoint and returns the parsed children-by-path map", async () => {
    const tree = { "": [{ name: "tiles", type: "directory" }] };
    const fetchMock = stubFetch(new Response(JSON.stringify(tree)));

    const result = await getDirectoryTree();

    expect(fetchMock).toHaveBeenCalledWith("/api/directories", undefined);
    expect(result).toEqual(tree);
  });

  it("rejects with an ApiError instance on failure", async () => {
    stubFetch(new Response("{}", { status: 500 }));

    await expect(getDirectoryTree()).rejects.toBeInstanceOf(ApiError);
  });
});
