exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE assets (
      id BIGSERIAL PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      size BIGINT NOT NULL,
      mtime TIMESTAMPTZ NOT NULL,
      hash TEXT NOT NULL,
      scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX assets_hash_idx ON assets (hash);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE assets;`);
};
