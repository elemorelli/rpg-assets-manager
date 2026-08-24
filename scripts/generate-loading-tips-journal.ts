import { randomInt } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT_PATH = path.join(SCRIPT_DIR, "loading-tips.txt");
const BLOCK_SEPARATOR = "---";
const DEFAULT_IMAGE = "modules/pf2e-tokens-characters/assets/portraits/pc-kobold-orator.webp";
const DEFAULT_OUTPUT_PATH = path.join(SCRIPT_DIR, "..", "dist", "fvtt-JournalEntry-loading-tips.json");

const FOUNDRY_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const FOUNDRY_ID_LENGTH = 16;
const SORT_STEP = 100000;

type LoadingTip = {
  name: string;
  text: string;
  image: string;
};

const generateFoundryId = (): string =>
  Array.from({ length: FOUNDRY_ID_LENGTH }, () => FOUNDRY_ID_CHARS[randomInt(FOUNDRY_ID_CHARS.length)]).join("");

const resolveImageSrc = (image: string): string => {
  const isFullUrl = image.startsWith("http://") || image.startsWith("https://");

  if (isFullUrl) {
    return image;
  }

  return image.startsWith("/") ? image.slice(1) : image;
};

const looksLikeImageLine = (line: string): boolean => !line.includes(" ");

const parseBlock = (block: string): LoadingTip => {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  if (lines.length === 0) {
    throw new Error(`Malformed tip block, expected a name line:\n${block}`);
  }

  const [name, ...remainingLines] = lines;
  const secondLineIsImage = remainingLines.length > 0 && looksLikeImageLine(remainingLines[0]);
  const image = secondLineIsImage ? remainingLines[0] : DEFAULT_IMAGE;
  const textLines = secondLineIsImage ? remainingLines.slice(1) : remainingLines;

  if (textLines.length === 0) {
    throw new Error(`Malformed tip block, expected at least a line of text:\n${block}`);
  }

  return { name, image, text: textLines.join(" ") };
};

const parseTipsFile = (contents: string): LoadingTip[] =>
  contents
    .split(new RegExp(`^${BLOCK_SEPARATOR}$`, "m"))
    .map((block) => block.trim())
    .filter((block) => block !== "" && !block.split("\n").every((line) => line.trim().startsWith("#") || line.trim() === ""))
    .map(parseBlock);

const buildJournalEntry = (tips: LoadingTip[]) => ({
  name: "Loading Tips",
  pages: tips.map((tip, index) => ({
    sort: (index + 1) * SORT_STEP,
    name: tip.name,
    type: "image",
    _id: generateFoundryId(),
    system: {},
    title: {
      show: false,
      level: 1,
    },
    image: {
      caption: tip.text,
    },
    text: {
      format: 1,
    },
    video: {
      controls: true,
      volume: 0.5,
    },
    src: resolveImageSrc(tip.image),
    category: null,
    ownership: {
      default: -1,
    },
    flags: {},
  })),
  folder: null,
  categories: [],
  ownership: {
    default: 0,
  },
  flags: {},
});

const inputArgIndex = process.argv.indexOf("--input");
const outputArgIndex = process.argv.indexOf("--output");

const inputPath = inputArgIndex === -1 ? DEFAULT_INPUT_PATH : path.resolve(process.argv[inputArgIndex + 1]);
const outputPath = outputArgIndex === -1 ? DEFAULT_OUTPUT_PATH : path.resolve(process.argv[outputArgIndex + 1]);

const contents = await fs.readFile(inputPath, "utf8");
const tips = parseTipsFile(contents);

if (tips.length === 0) {
  throw new Error(`No tips found in ${inputPath}`);
}

const journalEntry = buildJournalEntry(tips);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(journalEntry, null, 2)}\n`);

console.log(`Wrote ${tips.length} tips.`);
console.log(outputPath);
