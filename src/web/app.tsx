import { type JSX, useEffect, useState } from "react";

import { FileBrowser } from "./components/file-browser/file-browser.tsx";
import { LoginForm } from "./components/login-form/login-form.tsx";
import * as api from "./requests/index.ts";

const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";

export const App = (): JSX.Element | null => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sessionCheckError, setSessionCheckError] = useState<string | null>(null);

  useEffect(() => {
    api
      .checkSession()
      .then(setAuthenticated)
      .catch((caught: unknown) => setSessionCheckError(describeError(caught)));
  }, []);

  if (sessionCheckError) {
    return (
      <main>
        <h1>rpg-assets-manager</h1>
        <p>{sessionCheckError}</p>
      </main>
    );
  }

  if (authenticated === null) {
    return null;
  }

  return (
    <main>
      <h1>rpg-assets-manager</h1>
      {authenticated ? (
        <FileBrowser onLoggedOut={() => setAuthenticated(false)} />
      ) : (
        <LoginForm onLoggedIn={() => setAuthenticated(true)} />
      )}
    </main>
  );
};
