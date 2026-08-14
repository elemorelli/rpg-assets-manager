import { db } from "#server/db/index.ts";
import { computeBatchDiff } from "./compute-batch-diff.ts";

export const diffHandler = async () => computeBatchDiff(db);
