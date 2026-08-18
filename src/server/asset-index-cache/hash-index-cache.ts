import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";
import { createTtlCache, type TtlCache } from "#server/utils/ttl-cache.ts";
import type { RemoteIndexRecord } from "#utils/sync-status.ts";

const CACHE_TTL_MS = 60_000;

interface HashIndexCacheEntry {
  local: TtlCache<Map<string, string>>;
  remote: TtlCache<Map<string, RemoteIndexRecord>>;
}

const entriesByDb = new WeakMap<Kysely<DB>, HashIndexCacheEntry>();

const entryFor = (db: Kysely<DB>): HashIndexCacheEntry => {
  const existing = entriesByDb.get(db);

  if (existing) {
    return existing;
  }

  const created: HashIndexCacheEntry = {
    local: createTtlCache(CACHE_TTL_MS),
    remote: createTtlCache(CACHE_TTL_MS),
  };

  entriesByDb.set(db, created);

  return created;
};

const fetchLocalHashIndex = async (db: Kysely<DB>): Promise<Map<string, string>> => {
  const rows = await db.selectFrom("assets").select(["path", "hash"]).execute();

  return new Map(rows.map((row) => [row.path, row.hash]));
};

const fetchRemoteHashIndex = async (db: Kysely<DB>): Promise<Map<string, RemoteIndexRecord>> => {
  const rows = await db.selectFrom("remote_assets").select(["path", "hash", "size"]).execute();

  return new Map(rows.map((row) => [row.path, { hash: row.hash, size: Number(row.size) }]));
};

export const getLocalHashIndex = (db: Kysely<DB>): Promise<Map<string, string>> =>
  entryFor(db).local.get(() => fetchLocalHashIndex(db));

export const invalidateLocalHashIndex = (db: Kysely<DB>): void => {
  entriesByDb.get(db)?.local.invalidate();
};

export const getRemoteHashIndex = (db: Kysely<DB>): Promise<Map<string, RemoteIndexRecord>> =>
  entryFor(db).remote.get(() => fetchRemoteHashIndex(db));

export const invalidateRemoteHashIndex = (db: Kysely<DB>): void => {
  entriesByDb.get(db)?.remote.invalidate();
};
