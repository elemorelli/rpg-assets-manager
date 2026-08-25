import { cancelCurrentJob } from "./store.ts";

export const cancelJobHandler = (): { cancelled: boolean } => ({
  cancelled: cancelCurrentJob(),
});
