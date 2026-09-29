import type { Kysely } from "kysely";
import { vi } from "vitest";

import type { DB } from "#server/db/index.ts";

// Non-terminal chain methods return the same leaf proxy, so a test only configures the execute call it cares about.
const TERMINAL_METHODS = new Set(["execute", "executeTakeFirst", "executeTakeFirstOrThrow"]);

// Deliberate `any`: trading chain-shape checking for fluent calls that resolve without per-link wiring.
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

// where() predicate callbacks (eb.or in entries/delete.ts) are not evaluated here; integration tests cover them.

export type MockDb = Record<string, MockFn>;

export const createMockDb = (): Kysely<DB> => createRootProxy() as unknown as Kysely<DB>;
