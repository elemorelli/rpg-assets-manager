// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "#web/requests/index.ts";
import { FakeEventSource } from "#web/test-utils/fake-event-source.ts";

import { App } from "./app.tsx";

vi.mock("./requests/index.ts");

const checkSessionMock = vi.mocked(api.checkSession);
const listDirectoryMock = vi.mocked(api.listDirectory);
const fetchSyncRunsMock = vi.mocked(api.fetchSyncRuns);
const fetchTagsMock = vi.mocked(api.fetchTags);
const logoutMock = vi.mocked(api.logout);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDirectoryMock.mockResolvedValue([]);
    fetchSyncRunsMock.mockResolvedValue([]);
    fetchTagsMock.mockResolvedValue([]);
    logoutMock.mockResolvedValue(undefined);
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

  it("shows an error instead of a blank page when the session check itself fails", async () => {
    checkSessionMock.mockRejectedValue(new Error("network down"));

    render(<App />);

    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("does not show a Log out button before a session is authenticated", async () => {
    checkSessionMock.mockResolvedValue(false);

    render(<App />);

    await screen.findByLabelText("Password");
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument();
  });

  it("logs out and returns to the login form when Log out is clicked", async () => {
    const user = userEvent.setup();
    checkSessionMock.mockResolvedValue(true);

    render(<App />);
    await screen.findByRole("button", { name: "Log out" });

    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(logoutMock).toHaveBeenCalled();
    expect(await screen.findByLabelText("Password")).toBeInTheDocument();
  });
});
