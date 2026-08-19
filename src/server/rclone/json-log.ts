interface RcloneLogLine {
  msg?: unknown;
  object?: unknown;
  stats?: { checks?: unknown; totalChecks?: unknown };
}

const FILE_COMPLETION_MESSAGES = new Set(["Copied (new)", "Copied (replaced existing)", "Deleted"]);

const parseLogLine = (line: string): RcloneLogLine | null => {
  try {
    return JSON.parse(line) as RcloneLogLine;
  } catch {
    return null;
  }
};

export const parseCompletedFilePath = (line: string): string | null => {
  const parsed = parseLogLine(line);

  if (parsed === null || typeof parsed.msg !== "string" || typeof parsed.object !== "string") {
    return null;
  }

  return FILE_COMPLETION_MESSAGES.has(parsed.msg) ? parsed.object : null;
};

export interface RcloneCheckStats {
  done: number;
  total: number;
}

export const parseCheckStats = (line: string): RcloneCheckStats | null => {
  const parsed = parseLogLine(line);
  const checks = parsed?.stats?.checks;
  const totalChecks = parsed?.stats?.totalChecks;

  if (typeof checks !== "number" || typeof totalChecks !== "number") {
    return null;
  }

  return { done: checks, total: totalChecks };
};
