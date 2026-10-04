import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowsRotate,
  faCirclePlay,
  faCloudArrowUp,
  faScaleBalanced,
} from "@fortawesome/free-solid-svg-icons";

import type { JobType } from "#utils/job.ts";

const ICON_BY_JOB_TYPE: Partial<Record<JobType, IconDefinition>> = {
  rescan: faArrowsRotate,
  sync: faCloudArrowUp,
  reconcile: faScaleBalanced,
  "youtube-import": faCirclePlay,
};

export const iconForJobType = (type: JobType): IconDefinition | undefined => ICON_BY_JOB_TYPE[type];
