import { type JSX, useEffect, useState } from "react";
import { FileBrowser } from "./components/file-browser/file-browser.tsx";
import { LoginForm } from "./components/login-form/login-form.tsx";
import * as api from "./requests/index.ts";

export const App = (): JSX.Element | null => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    api.checkSession().then(setAuthenticated);
  }, []);

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
