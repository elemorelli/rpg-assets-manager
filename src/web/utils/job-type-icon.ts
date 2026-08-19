import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faArrowsRotate, faCloudArrowUp, faScaleBalanced } from "@fortawesome/free-solid-svg-icons";

const ICON_BY_JOB_TYPE: Record<string, IconDefinition> = {
  rescan: faArrowsRotate,
  apply: faCloudArrowUp,
  reconcile: faScaleBalanced,
};

export const iconForJobType = (type: string): IconDefinition | undefined => ICON_BY_JOB_TYPE[type];
