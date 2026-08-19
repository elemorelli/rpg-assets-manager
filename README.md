# rpg-assets-manager

Self-hosted web app to manage a Foundry VTT asset tree and keep a Cloudflare
R2 bucket in sync with it. It replaces a manual `upload.sh` workflow with a
file browser plus an explicit diff/apply sync flow, and it can generate a
Foundry macro that rewrites asset references after a rename or move.

Single-user tool, not a catalog: no tags, no metadata, no orphan detection.
See `docs/asset-manager-v1-handoff.md` for the full design.

## Features

- Browse, upload, delete, rename, move and create directories in the local
  asset tree, with drag-and-drop moves and search by name.
- Image previews and audio playback served from the local tree, so an
  unsynced file can be reviewed before deciding whether to sync it.
- WebP/Ogg conversion, explicit and user-triggered, honouring `.skip`
  directories.
- Sync flow: rescan the local tree, diff it against the last known R2 state,
  review a confirmation screen (additions, modifications, deletions,
  renames), then apply. Renames use rclone's server-side `moveto`, no bytes
  re-uploaded.
- Cloudflare cache purge on every replace, batched to the API's group limit.
- Foundry migration macro generated for any batch that includes renames or
  moves, with per-world acknowledgement tracked on the sync run.
- `rclone check`-based reconciliation between the local tree and R2 as a
  manual escape hatch.
- Single-password session auth (see `AUTH_PASSWORD_HASH` below).

## Stack

- **Backend**: Fastify, TypeScript, Kysely over Postgres (types generated
  with `kysely-codegen`, migrations via `node-pg-migrate`).
- **Frontend**: Vite, React, CSS Modules, no component library.
- **Sync engine**: rclone, against a Cloudflare R2 remote configured purely
  through `RCLONE_CONFIG_R2_*` environment variables (no `rclone.conf`).
- **Conversion**: `cwebp` and `ffmpeg`, called directly rather than shelling
  out to the old scripts.

## Local development

Requirements: Node 24, Docker (for Postgres), and the `rclone`, `cwebp` and
`ffmpeg` binaries on `PATH` if you want to exercise conversion or sync
against a real remote.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start Postgres:

   ```bash
   docker compose up -d postgres
   ```

3. Create a `.env` (gitignored) with at least:

   ```
   POSTGRES_PASSWORD=rpgassets_dev
   AUTH_PASSWORD_HASH=<node scripts/hash-password.ts '<password>'>
   AUTH_SESSION_SECRET=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
   ```

   Everything else (`RCLONE_*`, `CF_*`, `ASSETS_PUBLIC_BASE_URL`) is only
   required for real sync/conversion/macro testing; see `docs/deploy.md`
   for the dev-bucket setup that exercises those safely against a
   throwaway R2 bucket.

4. Run migrations, then start the app:

   ```bash
   npm run migrate:up
   npm run dev
   ```

   `npm run dev` runs the API with `--watch` on port 3001 and Vite on its
   default port, both against `./fixtures/tree` unless `ASSET_TREE_HOST_PATH`
   is set.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | API (watch mode) + Vite dev server |
| `npm run build` | Typecheck and build the frontend for production |
| `npm start` | Run the built API (used by the Docker image) |
| `npm test` | Run the Vitest suite |
| `npm run typecheck` | Typecheck server and web separately |
| `npm run check` / `check:write` | Biome lint (and autofix) |
| `npm run migrate:up` / `migrate:down` | Run/rollback Postgres migrations |
| `npm run codegen` | Regenerate Kysely types from the live database |

## Docker / deploy

`docker-compose.yml` defines `postgres`, `api` and `backup`. The `api`
service's `image` points at `ghcr.io/elemorelli/rpg-assets-manager:latest`,
published by `.github/workflows/docker-publish.yml` on every push to `main`;
it also keeps a `build` block for local image builds. `backup` runs
`pg_dump` on a loop and uploads the compressed dump to a dedicated R2
bucket via `rclone`, pruning old dumps past `BACKUP_RETENTION_DAYS`. Full
deploy runbook, including the dev-bucket dry run and the production
bootstrap, is in `docs/deploy.md`.

## Docs

- `docs/asset-manager-v1-handoff.md`: full v1 design (data model, diff and
  apply semantics, macro generator, infrastructure).
- `docs/deploy.md`: dev-bucket test procedure and the real deploy runbook.
