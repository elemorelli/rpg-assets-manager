export interface FixtureFile {
  relativePath: string;
  content: Buffer;
}

// A minimal valid 1x1 PNG. Real decoders stop reading at the IEND chunk, so
// appending a few unique trailing bytes (see uniqueContent) keeps each file
// byte-distinguishable for hashing without corrupting the image.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

// A minimal valid silent WAV (8-bit PCM, one silent sample).
const SILENT_WAV = Buffer.from(
  "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
  "base64",
);

const uniqueContent = (base: Buffer, seed: string): Buffer =>
  Buffer.concat([base, Buffer.from(seed)]);

export const buildFixtureTreeManifest = (): FixtureFile[] => {
  const uniquePaths = [
    "tiles/forest.png",
    "tiles/forest-night.png",
    "maps/kingmaker-overview.png",
    "audio/ambient-forest.wav",
    "handouts/letter-01.png",
    "characters/npc-portrait.png",
    "icons/sword.png",
    "landing_page/hero.png",
    "notice_board/announcement.png",
    "token-markers/marker-red.png",
    "book_images/page-12.png",
    "tiles/legacy-pack/old-tile.png",
  ];

  const files: FixtureFile[] = uniquePaths.map((relativePath) => ({
    relativePath,
    content: uniqueContent(relativePath.endsWith(".wav") ? SILENT_WAV : TINY_PNG, relativePath),
  }));

  // Deliberate duplicate: identical bytes at two different paths, the way
  // the real tree has the same card art reused across directories.
  const duplicateContent = uniqueContent(TINY_PNG, "duplicate-pair");

  files.push(
    { relativePath: "tiles/campfire.png", content: duplicateContent },
    { relativePath: "handouts/campfire-card.png", content: duplicateContent },
  );

  // .skip marks tiles/legacy-pack as do-not-convert (zero-byte control file).
  files.push({ relativePath: "tiles/legacy-pack/.skip", content: Buffer.alloc(0) });

  return files;
};
