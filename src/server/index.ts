import { buildApp } from "./app.ts";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "127.0.0.1";
const FRONTEND_DIST_DIR = process.env.FRONTEND_DIST_DIR ?? null;

const app = buildApp({ frontendDistDir: FRONTEND_DIST_DIR });

app.listen({ port: PORT, host: HOST }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
