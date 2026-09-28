// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { DOWNLOAD_SPACING_MS, triggerDownload, triggerDownloads } from "../trigger-download.ts";

let clickSpy: MockInstance<() => void>;

const clickedHrefs = (): string[] =>
  clickSpy.mock.contexts.map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "");

describe("triggerDownload", () => {
  beforeEach(() => {
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("clicks a temporary download link and removes it afterwards", () => {
    triggerDownload("/api/files/download?path=map.png");

    expect(clickedHrefs()).toEqual(["/api/files/download?path=map.png"]);
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("spaces out several downloads so the browser does not drop any of them", () => {
    vi.useFakeTimers();

    triggerDownloads(["/a", "/b", "/c"]);

    expect(clickedHrefs()).toEqual(["/a"]);

    vi.advanceTimersByTime(DOWNLOAD_SPACING_MS);

    expect(clickedHrefs()).toEqual(["/a", "/b"]);

    vi.advanceTimersByTime(DOWNLOAD_SPACING_MS);

    expect(clickedHrefs()).toEqual(["/a", "/b", "/c"]);
  });
});
