import { type FormEvent, type JSX, useState } from "react";

import * as api from "#web/requests/index.ts";
import { describeError } from "#web/utils/describe-error.ts";

import styles from "./login-form.module.css";

export interface LoginFormProps {
  onLoggedIn: () => void;
}

export const LoginForm = ({ onLoggedIn }: LoginFormProps): JSX.Element => {
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    api
      .login(password)
      .then(onLoggedIn)
      .catch((caught: unknown) => setError(describeError(caught)))
      .finally(() => setBusy(false));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        type="password"
        value={password}
        disabled={busy}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button type="submit" disabled={busy}>
        Log in
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
};
