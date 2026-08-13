exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE remote_assets (
      id BIGSERIAL PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      size BIGINT NOT NULL,
      hash TEXT NOT NULL,
      synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX remote_assets_hash_idx ON remote_assets (hash);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE remote_assets;`);
};
