import { describeError } from "./describe-error.ts";

export interface BatchOperationResult {
  successCount: number;
  errorMessage: string | null;
}

export const runBatchOperation = async <T>(
  items: T[],
  operate: (item: T) => Promise<void>,
  describeItem: (item: T) => string,
  verb: string,
): Promise<BatchOperationResult> => {
  let successCount = 0;
  let errorMessage: string | null = null;

  for (const item of items) {
    try {
      await operate(item);
      successCount += 1;
    } catch (error) {
      errorMessage = `${verb} ${successCount} of ${items.length} before failing on "${describeItem(item)}": ${describeError(error)}`;
      break;
    }
  }

  return { successCount, errorMessage };
};
