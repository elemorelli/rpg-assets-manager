export interface JobState {
  type: string;
  stage: string;
  detail?: string;
  done: number;
  total: number;
  startedAt: number;
  error: string | null;
  cancelled?: boolean;
}

export type CurrentJob = JobState | null;

export const startJob = (type: string, stage: string, total: number): JobState => ({
  type,
  stage,
  detail: undefined,
  done: 0,
  total,
  startedAt: Date.now(),
  error: null,
});

export const advanceJob = (job: JobState, done: number, detail?: string): JobState => ({
  ...job,
  done,
  detail,
});

export const failJob = (job: JobState, error: string): JobState => ({
  ...job,
  error,
});

export const cancelJob = (job: JobState): JobState => ({
  ...job,
  cancelled: true,
});

export const toErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

export const formatJobEvent = (job: CurrentJob): string => `data: ${JSON.stringify(job)}\n\n`;

export const parseJobEvent = (data: string): CurrentJob => JSON.parse(data) as CurrentJob;
