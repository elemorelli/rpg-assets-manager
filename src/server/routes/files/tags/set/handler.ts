import { withHttpErrorHandling } from "#server/errors/index.ts";
import { setAssetTags } from "./set-asset-tags.ts";

interface SetTagsBody {
  path?: string;
  tags?: string[];
}

export const setAssetTagsHandler = (assetTreeRoot: string) =>
  withHttpErrorHandling(async (request) => {
    const body = request.body as SetTagsBody | undefined;
    const tags = await setAssetTags(assetTreeRoot, body?.path ?? "", body?.tags ?? []);

    return { tags };
  });
