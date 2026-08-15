import type { FastifyReply, FastifyRequest } from "fastify";
import { respondToHttpError } from "#server/errors/index.ts";
import { setAssetTags } from "./set-asset-tags.ts";

interface SetTagsBody {
  path?: string;
  tags?: string[];
}

export const setAssetTagsHandler =
  (assetTreeRoot: string) => async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as SetTagsBody | undefined;

    try {
      const tags = await setAssetTags(assetTreeRoot, body?.path ?? "", body?.tags ?? []);

      return { tags };
    } catch (error) {
      respondToHttpError(error, reply);

      return undefined;
    }
  };
