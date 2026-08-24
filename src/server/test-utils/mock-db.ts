import type { Kysely } from "kysely";
import { vi } from "vitest";

import type { DB } from "#server/db/index.ts";

// Kysely's query builder is a fluent chain (selectFrom().select().where().execute()).
// Every non-terminal chain method below returns the same leaf proxy by default, so a
// test only has to configure the terminal execute-family call it actually cares about.
const TERMINAL_METHODS = new Set(["execute", "executeTakeFirst", "executeTakeFirstOrThrow"]);

// `any` here is deliberate: this stub trades away static chain-shape checking so every
// fluent call resolves at runtime without per-link wiring in every test.
type MockFn = ReturnType<typeof vi.fn<(...args: any[]) => any>>;

const createLeafProxy = (): unknown => {
  const methodCache = new Map<string, MockFn>();

  const leafProxy: unknown = new Proxy(
    {},
    {
      get: (_target, property: string) => {
        if (property === "then") {
          return undefined;
        }

        const cachedMethod = methodCache.get(property);

        if (cachedMethod) {
          return cachedMethod;
        }

        const isTerminalMethod = TERMINAL_METHODS.has(property);
        const method: MockFn = vi.fn(() => (isTerminalMethod ? undefined : leafProxy));

        methodCache.set(property, method);

        return method;
      },
    },
  );

  return leafProxy;
};

const createRootProxy = (): unknown => {
  const methodCache = new Map<string, MockFn>();
  const leavesByCall = new Map<string, unknown>();

  const rootProxy: unknown = new Proxy(
    {},
    {
      get: (_target, property: string) => {
        if (property === "then") {
          return undefined;
        }

        const cachedMethod = methodCache.get(property);

        if (cachedMethod) {
          return cachedMethod;
        }

        const method: MockFn = vi.fn((...args: unknown[]) => {
          if (property === "transaction") {
            return { execute: (callback: (trx: unknown) => unknown) => callback(rootProxy) };
          }

          const callKey = `${property}:${JSON.stringify(args)}`;
          const existingLeaf = leavesByCall.get(callKey);

          if (existingLeaf) {
            return existingLeaf;
          }

          const leaf = createLeafProxy();

          leavesByCall.set(callKey, leaf);

          return leaf;
        });

        methodCache.set(property, method);

        return method;
      },
    },
  );

  return rootProxy;
};

// where() predicate callbacks (the eb.or(...) pattern in delete-entry.ts / move-entry.ts)
// are intentionally not evaluated here; that's covered by *.integration.test.ts instead.

export type MockDb = Record<string, MockFn>;

export const createMockDb = (): Kysely<DB> => createRootProxy() as unknown as Kysely<DB>;
