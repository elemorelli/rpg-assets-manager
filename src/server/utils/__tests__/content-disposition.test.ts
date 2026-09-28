import { describe, expect, it } from "vitest";

import { buildAttachmentDisposition } from "../content-disposition.ts";

describe("buildAttachmentDisposition", () => {
  it("keeps a plain ASCII file name as is", () => {
    expect(buildAttachmentDisposition("forest.png")).toBe(
      `attachment; filename="forest.png"; filename*=UTF-8''forest.png`,
    );
  });

  it("replaces non-ASCII characters in the fallback and encodes them in the UTF-8 form", () => {
    expect(buildAttachmentDisposition("canción.ogg")).toBe(
      `attachment; filename="canci_n.ogg"; filename*=UTF-8''canci%C3%B3n.ogg`,
    );
  });

  it("strips quotes and backslashes from the fallback so the header stays well formed", () => {
    expect(buildAttachmentDisposition(`boss "final" \\ fight.ogg`)).toBe(
      `attachment; filename="boss _final_ _ fight.ogg"; filename*=UTF-8''boss%20%22final%22%20%5C%20fight.ogg`,
    );
  });

  it("percent-encodes the characters encodeURIComponent leaves alone but RFC 5987 forbids", () => {
    expect(buildAttachmentDisposition("it's (old)*.png")).toBe(
      `attachment; filename="it's (old)*.png"; filename*=UTF-8''it%27s%20%28old%29%2A.png`,
    );
  });
});
