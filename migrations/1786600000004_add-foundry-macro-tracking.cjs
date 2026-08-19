exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE sync_runs DROP COLUMN IF EXISTS generated_macro;`);
  pgm.sql(`ALTER TABLE sync_runs DROP COLUMN IF EXISTS world_acknowledgements;`);

  pgm.sql(`
    CREATE TABLE foundry_worlds (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      active BOOLEAN NOT NULL DEFAULT true,
      acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE asset_renames (
      id BIGSERIAL PRIMARY KEY,
      old_path TEXT NOT NULL,
      new_path TEXT NOT NULL,
      renamed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE asset_renames;`);
  pgm.sql(`DROP TABLE foundry_worlds;`);
  pgm.sql(`ALTER TABLE sync_runs ADD COLUMN generated_macro TEXT;`);
  pgm.sql(`ALTER TABLE sync_runs ADD COLUMN world_acknowledgements JSONB NOT NULL DEFAULT '{}';`);
};
