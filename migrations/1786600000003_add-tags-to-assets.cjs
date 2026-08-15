exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE assets ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';`);
  pgm.sql(`CREATE INDEX assets_tags_idx ON assets USING GIN (tags);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX assets_tags_idx;`);
  pgm.sql(`ALTER TABLE assets DROP COLUMN tags;`);
};
