import fs from "node:fs/promises";
import path from "node:path";
import { buildFixtureTreeManifest } from "./fixture-tree.ts";

const REAL_TREE_MARKERS = ["tiles", "maps", "audio", "characters"];

const assertSafeTarget = async (dir: string): Promise<void> => {
  const knownRealTree = path.resolve(process.env.HOME ?? "", "rpg", "assets");

  if (dir === knownRealTree) {
    throw new Error(
      `Refusing to write to ${dir}: this is the real asset tree. ` +
        "The fixture generator only ever writes synthetic data to a dedicated dev path.",
    );
  }

  let entries: string[] = [];

  try {
    entries = await fs.readdir(dir);
  } catch {
    return;
  }

  const looksReal = REAL_TREE_MARKERS.every((marker) => entries.includes(marker));

  if (looksReal && entries.length > REAL_TREE_MARKERS.length + 2) {
    throw new Error(
      `Refusing to write to ${dir}: it already contains a directory layout that ` +
        "looks like a real asset tree, not an empty fixture target.",
    );
  }
};

const writeFixtureTree = async (dir: string): Promise<void> => {
  await assertSafeTarget(dir);

  const files = buildFixtureTreeManifest();

  for (const file of files) {
    const fullPath = path.join(dir, file.relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.content);
  }

  console.log(`Wrote ${files.length} fixture files to ${dir}`);
};

const targetArgIndex = process.argv.indexOf("--target");

if (targetArgIndex === -1 || !process.argv[targetArgIndex + 1]) {
  console.error("Usage: node scripts/generate-fixture-tree.ts --target <dir>");
  process.exit(1);
}

await writeFixtureTree(path.resolve(process.argv[targetArgIndex + 1]));
