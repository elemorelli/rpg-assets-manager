import { db } from "../../db/index.ts";
import { computeBatchDiff } from "./computeBatchDiff.ts";

export const diffHandler = async () => computeBatchDiff(db);
