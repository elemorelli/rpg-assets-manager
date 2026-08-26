// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { __resetAppConfigCacheForTests } from "../use-app-config.ts";
import { usePublicAssetLink } from "../use-public-asset-link.ts";

vi.mock("#web/requests/index.ts");

const fetchAppConfigMock = vi.mocked(api.fetchAppConfig);

const COPY_FEEDBACK_DURATION_MS = 1500;

describe("usePublicAssetLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAppConfigCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has no public url before the config resolves, and none once resolved with no base url", async () => {
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: null });

    const { result } = renderHook(() => usePublicAssetLink("handouts/map.png"));

    expect(result.current.publicAssetUrl).toBeNull();

    await waitFor(() => expect(fetchAppConfigMock).toHaveBeenCalled());
    expect(result.current.publicAssetUrl).toBeNull();
  });

  it("joins the configured base url with the relative path", async () => {
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: "https://assets.example.com" });

    const { result } = renderHook(() => usePublicAssetLink("handouts/map.png"));

    await waitFor(() =>
      expect(result.current.publicAssetUrl).toBe("https://assets.example.com/handouts/map.png"),
    );
  });

  it("copies the url to the clipboard and clears the copied flag after the feedback window", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: "https://assets.example.com" });

    const { result } = renderHook(() => usePublicAssetLink("handouts/map.png"));

    await waitFor(() => expect(result.current.publicAssetUrl).not.toBeNull());

    vi.useFakeTimers();
    act(() => {
      result.current.handleCopyLink();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(writeTextMock).toHaveBeenCalledWith("https://assets.example.com/handouts/map.png");
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(COPY_FEEDBACK_DURATION_MS);
    });

    expect(result.current.copied).toBe(false);
  });
});
