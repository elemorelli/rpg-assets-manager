import { vi } from "vitest";

export const stubFetch = (response: Response): ReturnType<typeof vi.fn> => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
};
