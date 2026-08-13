import { runner } from "node-pg-migrate";
import { buildApp } from "./app.ts";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";
const FRONTEND_DIST_DIR = process.env.FRONTEND_DIST_DIR ?? null;
const DATABASE_URL = process.env.DATABASE_URL;

const start = async (): Promise<void> => {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  await runner({
    databaseUrl: DATABASE_URL,
    dir: "migrations",
    direction: "up",
    migrationsTable: "pgmigrations",
  });

  const app = buildApp({ frontendDistDir: FRONTEND_DIST_DIR });

  await app.listen({ port: PORT, host: HOST });
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
