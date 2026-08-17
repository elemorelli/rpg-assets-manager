export const describeError = (caught: unknown): string =>
  caught instanceof Error ? caught.message : "Something went wrong";
