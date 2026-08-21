import type { OperationScope } from "#utils/operation-scope.ts";

export interface FilesPathBody {
  path?: string;
}

export interface FilesPathQuery {
  path?: string;
}

export interface FilesScopedPathBody {
  path?: string;
  scope?: OperationScope;
}

export interface FilesScopedPathQuery {
  path?: string;
  scope?: OperationScope;
}
