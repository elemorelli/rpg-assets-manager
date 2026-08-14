// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#web/requests/index.ts";
import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";
import { App } from "./app.tsx";

vi.mock("./requests/index.ts");

const checkSessionMock = vi.mocked(api.checkSession);
const listDirectoryMock = vi.mocked(api.listDirectory);
const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDirectoryMock.mockResolvedValue([]);
    fetchSyncRunsMock.mockResolvedValue([]);
    FakeEventSource.reset();
    // @ts-expect-error test double
    globalThis.EventSource = FakeEventSource;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error test double
    delete globalThis.EventSource;
  });

  it("renders the login form when there is no active session", async () => {
    checkSessionMock.mockResolvedValue(false);

    render(<App />);

    expect(await screen.findByLabelText("Password")).toBeInTheDocument();
  });

  it("renders the file browser when a session is already active", async () => {
    checkSessionMock.mockResolvedValue(true);

    render(<App />);

    expect(await screen.findByRole("button", { name: "Rescan" })).toBeInTheDocument();
  });
});
