import { describe, expect, it } from "vitest";

import { formatFileSize } from "../format-file-size.ts";

const ZERO_BYTES = 0;
const SUB_KILOBYTE_SIZE = 500;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const BYTES_PER_GB = BYTES_PER_MB * BYTES_PER_KB;
const ONE_AND_A_HALF_KILOBYTES = BYTES_PER_KB + BYTES_PER_KB / 2;

describe("formatFileSize", () => {
  it("renders sub-kilobyte sizes in bytes", () => {
    expect(formatFileSize(ZERO_BYTES)).toBe("0 B");
    expect(formatFileSize(SUB_KILOBYTE_SIZE)).toBe("500 B");
  });

  it("renders kilobyte sizes, rounded to one decimal", () => {
    expect(formatFileSize(BYTES_PER_KB)).toBe("1 KB");
    expect(formatFileSize(ONE_AND_A_HALF_KILOBYTES)).toBe("1.5 KB");
  });

  it("renders megabyte and gigabyte sizes", () => {
    expect(formatFileSize(BYTES_PER_MB)).toBe("1 MB");
    expect(formatFileSize(BYTES_PER_GB)).toBe("1 GB");
  });
});
