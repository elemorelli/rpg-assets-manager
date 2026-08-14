import { db } from "#server/db/index.ts";
import { computeBatchDiff } from "./computeBatchDiff.ts";

export const diffHandler = async () => computeBatchDiff(db);
