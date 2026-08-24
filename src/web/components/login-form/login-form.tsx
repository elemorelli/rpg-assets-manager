import { type FormEvent, type JSX, useState } from "react";

import { Button } from "#components/button/button.tsx";
import { MessageBanner } from "#components/message-banner/message-banner.tsx";
import * as api from "#web/requests/index.ts";
import { describeErrorAsMessage, type Message } from "#web/utils/message.ts";

import styles from "./login-form.module.css";

export interface LoginFormProps {
  onLoggedIn: () => void;
}

export const LoginForm = ({ onLoggedIn }: LoginFormProps): JSX.Element => {
  const [password, setPassword] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    api
      .login(password)
      .then(onLoggedIn)
      .catch((caught: unknown) => setMessage(describeErrorAsMessage(caught)))
      .finally(() => setBusy(false));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        className={styles.passwordInput}
        type="password"
        value={password}
        disabled={busy}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button type="submit" variant="primary" disabled={busy}>
        Log in
      </Button>
      {message && <MessageBanner message={message} />}
    </form>
  );
};
