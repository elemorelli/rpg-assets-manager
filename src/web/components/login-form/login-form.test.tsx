// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "#web/requests/index.ts";
import { LoginForm } from "./login-form.tsx";

vi.mock("../../requests/index.ts");

const loginMock = vi.mocked(api.login);

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the typed password and calls onLoggedIn on success", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    loginMock.mockResolvedValue(undefined);

    render(<LoginForm onLoggedIn={onLoggedIn} />);
    await user.type(screen.getByLabelText("Password"), "hunter2");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(loginMock).toHaveBeenCalledWith("hunter2");
    await vi.waitFor(() => expect(onLoggedIn).toHaveBeenCalled());
  });

  it("shows an inline error when login is rejected", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new Error("wrong password"));

    render(<LoginForm onLoggedIn={vi.fn()} />);
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("wrong password")).toBeInTheDocument();
  });
});
