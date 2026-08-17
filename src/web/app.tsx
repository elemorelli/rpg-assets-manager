import { type JSX, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";

import { describeError } from "#web/utils/describe-error.ts";

import styles from "./app.module.css";
import logoUrl from "./assets/logo.png";
import { FileBrowser } from "./components/file-browser/file-browser.tsx";
import { LoginForm } from "./components/login-form/login-form.tsx";
import * as api from "./requests/index.ts";

const APP_TITLE = "rpg-assets-manager";

const AppTitle = ({ linkToRoot }: { linkToRoot: boolean }): JSX.Element => {
  const label = (
    <>
      <img className={styles.icon} src={logoUrl} alt="" />
      {APP_TITLE}
    </>
  );

  if (!linkToRoot) {
    return <h1 className={styles.title}>{label}</h1>;
  }

  return (
    <h1 className={styles.title}>
      <Link to="/" className={styles.titleLink}>
        {label}
      </Link>
    </h1>
  );
};

export const App = (): JSX.Element | null => {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [sessionCheckError, setSessionCheckError] = useState<string | null>(null);

  useEffect(() => {
    api
      .checkSession()
      .then(setAuthenticated)
      .catch((caught: unknown) => setSessionCheckError(describeError(caught)));
  }, []);

  const handleLogout = (): void => {
    api.logout().then(() => setAuthenticated(false));
  };

  if (sessionCheckError) {
    return (
      <main>
        <AppTitle linkToRoot={false} />
        <p>{sessionCheckError}</p>
      </main>
    );
  }

  if (authenticated === null) {
    return null;
  }

  return (
    <BrowserRouter>
      <main className={styles.page}>
        <div className={styles.titleBar}>
          <AppTitle linkToRoot={authenticated} />
          {authenticated && (
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Log out
            </button>
          )}
        </div>
        {authenticated ? (
          <Routes>
            <Route path="/*" element={<FileBrowser />} />
          </Routes>
        ) : (
          <LoginForm onLoggedIn={() => setAuthenticated(true)} />
        )}
      </main>
    </BrowserRouter>
  );
};
