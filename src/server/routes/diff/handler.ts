import { db } from "#server/db/index.ts";

import { computeBatchDiff } from "./compute-batch.ts";

export const diffHandler = async () => computeBatchDiff(db);
