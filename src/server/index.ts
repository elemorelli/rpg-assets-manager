import { runner } from "node-pg-migrate";
import { buildApp } from "./app.ts";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3001;

const HOST = process.env.HOST ?? DEFAULT_HOST;
const PORT = Number(process.env.PORT ?? DEFAULT_PORT);
const FRONTEND_DIST_DIR = process.env.FRONTEND_DIST_DIR ?? null;
const DATABASE_URL = process.env.DATABASE_URL;
const ASSET_TREE_ROOT = process.env.ASSET_TREE_ROOT;
const THUMBNAIL_CACHE_DIR = process.env.THUMBNAIL_CACHE_DIR;

const start = async (): Promise<void> => {
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  if (!ASSET_TREE_ROOT) {
    throw new Error("ASSET_TREE_ROOT is not set");
  }

  if (!THUMBNAIL_CACHE_DIR) {
    throw new Error("THUMBNAIL_CACHE_DIR is not set");
  }

  await runner({
    databaseUrl: DATABASE_URL,
    dir: "migrations",
    direction: "up",
    migrationsTable: "pgmigrations",
  });

  const app = buildApp({
    frontendDistDir: FRONTEND_DIST_DIR,
    assetTreeRoot: ASSET_TREE_ROOT,
    thumbnailCacheDir: THUMBNAIL_CACHE_DIR,
  });

  await app.listen({ port: PORT, host: HOST });
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
