exports.up = (pgm) => {
  pgm.sql(`ALTER TABLE assets ADD COLUMN previous_hash TEXT;`);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE assets DROP COLUMN previous_hash;`);
};
