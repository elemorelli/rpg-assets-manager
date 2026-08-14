export interface JobState {
  type: string;
  stage: string;
  done: number;
  total: number;
  error: string | null;
}

export type CurrentJob = JobState | null;

export const startJob = (type: string, stage: string, total: number): JobState => ({
  type,
  stage,
  done: 0,
  total,
  error: null,
});

export const advanceJob = (job: JobState, done: number): JobState => ({
  ...job,
  done,
});

export const failJob = (job: JobState, error: string): JobState => ({
  ...job,
  error,
});

export const formatJobEvent = (job: CurrentJob): string => `data: ${JSON.stringify(job)}\n\n`;

export const parseJobEvent = (data: string): CurrentJob => JSON.parse(data) as CurrentJob;
