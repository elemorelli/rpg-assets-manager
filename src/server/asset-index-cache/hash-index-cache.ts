import type { Kysely } from "kysely";

import { type DB, db } from "#server/db/index.ts";
import { createTtlCache, type TtlCache } from "#server/utils/ttl-cache.ts";
import type { LocalIndexRecord, RemoteIndexRecord } from "#utils/sync-status.ts";

const CACHE_TTL_MS = 60_000;

interface HashIndexCacheEntry {
  local: TtlCache<Map<string, LocalIndexRecord>>;
  remote: TtlCache<Map<string, RemoteIndexRecord>>;
}

const entriesByDb = new WeakMap<Kysely<DB>, HashIndexCacheEntry>();

const entryFor = (): HashIndexCacheEntry => {
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

const fetchLocalHashIndex = async (): Promise<Map<string, LocalIndexRecord>> => {
  const rows = await db.selectFrom("assets").select(["path", "hash", "previous_hash"]).execute();

  return new Map(
    rows.map((row) => [row.path, { hash: row.hash, previousHash: row.previous_hash ?? undefined }]),
  );
};

const fetchRemoteHashIndex = async (): Promise<Map<string, RemoteIndexRecord>> => {
  const rows = await db.selectFrom("remote_assets").select(["path", "hash", "size"]).execute();

  return new Map(rows.map((row) => [row.path, { hash: row.hash, size: Number(row.size) }]));
};

export const getLocalHashIndex = (): Promise<Map<string, LocalIndexRecord>> =>
  entryFor().local.get(() => fetchLocalHashIndex());

export const invalidateLocalHashIndex = (): void => {
  entriesByDb.get(db)?.local.invalidate();
};

export const getRemoteHashIndex = (): Promise<Map<string, RemoteIndexRecord>> =>
  entryFor().remote.get(() => fetchRemoteHashIndex());

export const invalidateRemoteHashIndex = (): void => {
  entriesByDb.get(db)?.remote.invalidate();
};
