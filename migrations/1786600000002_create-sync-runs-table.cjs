exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE sync_runs (
      id BIGSERIAL PRIMARY KEY,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      added_count INTEGER NOT NULL DEFAULT 0,
      modified_count INTEGER NOT NULL DEFAULT 0,
      deleted_count INTEGER NOT NULL DEFAULT 0,
      renamed_count INTEGER NOT NULL DEFAULT 0,
      outcome TEXT NOT NULL DEFAULT 'in_progress',
      purged_urls JSONB NOT NULL DEFAULT '[]',
      generated_macro TEXT,
      world_acknowledgements JSONB NOT NULL DEFAULT '{}'
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE sync_runs;`);
};
