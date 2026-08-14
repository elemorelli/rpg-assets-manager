export interface RcloneCheckResult {
  matchCount: number;
  missingOnSource: string[];
  missingOnDestination: string[];
  differs: string[];
  errors: string[];
}

const COMBINED_REPORT_LINE_PATTERN = /^([=\-+*!]) (.*)$/;

export const parseCombinedReport = (reportContent: string): RcloneCheckResult => {
  const result: RcloneCheckResult = {
    matchCount: 0,
    missingOnSource: [],
    missingOnDestination: [],
    differs: [],
    errors: [],
  };

  const lines = reportContent.split("\n").filter((line) => line.length > 0);

  for (const line of lines) {
    const match = line.match(COMBINED_REPORT_LINE_PATTERN);

    if (!match) {
      continue;
    }

    const [, symbol, relativePath] = match;

    switch (symbol) {
      case "=":
        result.matchCount += 1;
        break;
      case "-":
        result.missingOnSource.push(relativePath);
        break;
      case "+":
        result.missingOnDestination.push(relativePath);
        break;
      case "*":
        result.differs.push(relativePath);
        break;
      case "!":
        result.errors.push(relativePath);
        break;
      default:
        break;
    }
  }

  return result;
};
