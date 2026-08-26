// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";

import { __resetAppConfigCacheForTests, useAppConfig } from "../use-app-config.ts";

vi.mock("#web/requests/index.ts");

const fetchAppConfigMock = vi.mocked(api.fetchAppConfig);

describe("useAppConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAppConfigCacheForTests();
  });

  it("resolves the fetched config", async () => {
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: "https://assets.example.com" });

    const { result } = renderHook(() => useAppConfig());

    await waitFor(() =>
      expect(result.current).toEqual({ assetsPublicBaseUrl: "https://assets.example.com" }),
    );
  });

  it("shares a single underlying request across many mounted consumers", async () => {
    fetchAppConfigMock.mockResolvedValue({ assetsPublicBaseUrl: null });

    const hooks = Array.from({ length: 50 }, () => renderHook(() => useAppConfig()));

    await waitFor(() => {
      for (const { result } of hooks) {
        expect(result.current).toEqual({ assetsPublicBaseUrl: null });
      }
    });

    expect(fetchAppConfigMock).toHaveBeenCalledTimes(1);
  });
});
