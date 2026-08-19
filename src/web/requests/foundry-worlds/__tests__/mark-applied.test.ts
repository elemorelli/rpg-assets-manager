import { describe, expect, it } from "vitest";

import { stubFetch } from "#web/test-utils/stub-fetch.ts";

import { markFoundryWorldApplied } from "../mark-applied.ts";

const WORLD_ID = 42;

describe("markFoundryWorldApplied", () => {
  it("POSTs to the world's mark-applied endpoint", async () => {
    const fetchMock = stubFetch(new Response(JSON.stringify({ applied: true })));

    await markFoundryWorldApplied(WORLD_ID);

    expect(fetchMock).toHaveBeenCalledWith(`/api/foundry-worlds/${WORLD_ID}/mark-applied`, {
      method: "POST",
    });
  });
});
