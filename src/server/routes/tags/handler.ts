import { listDistinctTags } from "./list-distinct-tags.ts";

export const listTagsHandler = async (): Promise<string[]> => listDistinctTags();
