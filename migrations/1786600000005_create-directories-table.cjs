exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE directories (
      id BIGSERIAL PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      parent_id BIGINT REFERENCES directories(id) ON DELETE CASCADE,
      total_size BIGINT NOT NULL DEFAULT 0,
      file_count INTEGER NOT NULL DEFAULT 0,
      folder_count INTEGER NOT NULL DEFAULT 0
    );
  `);
  pgm.sql(`CREATE INDEX directories_parent_id_idx ON directories (parent_id);`);
  pgm.sql(`INSERT INTO directories (path, parent_id) VALUES ('', NULL);`);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE directories;`);
};
