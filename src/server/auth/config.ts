export interface AuthConfig {
  passwordHash: string;
  sessionSecret: string;
  cookieSecure: boolean;
}

interface AuthEnv {
  AUTH_PASSWORD_HASH?: string;
  AUTH_SESSION_SECRET?: string;
  AUTH_COOKIE_SECURE?: string;
}

export const resolveAuthConfig = (env: AuthEnv): AuthConfig => {
  const passwordHash = env.AUTH_PASSWORD_HASH;
  const sessionSecret = env.AUTH_SESSION_SECRET;

  if (!passwordHash) {
    throw new Error("AUTH_PASSWORD_HASH is not set");
  }

  if (!sessionSecret) {
    throw new Error("AUTH_SESSION_SECRET is not set");
  }

  return {
    passwordHash,
    sessionSecret,
    cookieSecure: env.AUTH_COOKIE_SECURE === "true",
  };
};

export const authConfig: AuthConfig = resolveAuthConfig(process.env);
