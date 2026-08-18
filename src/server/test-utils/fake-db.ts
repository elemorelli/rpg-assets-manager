import type { Kysely } from "kysely";

import type { DB } from "#server/db/index.ts";

// Hand-rolled in-memory double for the small subset of the Kysely query builder
// that src/server's business logic actually uses (selectFrom/insertInto/updateTable/
// deleteFrom with equality/"in"/"like" where, callback where with eb.or(), onConflict
// upserts, orderBy, returning). It does NOT execute real SQL: raw `sql` template
// queries (Postgres arrays, JSONB operators, FULL OUTER JOIN) are out of scope on
// purpose, since faking their exact Postgres semantics would risk tests passing
// against behavior Postgres doesn't have. Those stay covered by real
// *.integration.test.ts files instead.

type Row = Record<string, unknown>;
type WhereOperator = "=" | "in" | "like";
type OrderDirection = "asc" | "desc";

interface WhereClause {
  readonly column: string;
  readonly operator: WhereOperator;
  readonly value: unknown;
}

interface WhereExpression {
  readonly matches: (row: Row) => boolean;
}

type WhereCondition = WhereClause | WhereExpression;

type ExpressionBuilder = ((
  column: string,
  operator: WhereOperator,
  value: unknown,
) => WhereExpression) & {
  or: (expressions: WhereExpression[]) => WhereExpression;
};

const isWhereExpression = (condition: WhereCondition): condition is WhereExpression =>
  "matches" in condition;

const escapeRegExpLiteral = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const matchesLikePattern = (value: unknown, pattern: string): boolean => {
  if (typeof value !== "string") {
    return false;
  }

  const regexSource = `^${pattern.split("%").map(escapeRegExpLiteral).join(".*")}$`;

  return new RegExp(regexSource).test(value);
};

const asColumnList = (columns: string | string[]): string[] =>
  Array.isArray(columns) ? columns : [columns];

const rowMatchesClause = (row: Row, clause: WhereClause): boolean => {
  if (clause.operator === "in") {
    return Array.isArray(clause.value) && clause.value.includes(row[clause.column]);
  }

  if (clause.operator === "like") {
    return matchesLikePattern(row[clause.column], clause.value as string);
  }

  return row[clause.column] === clause.value;
};

const conditionMatches = (row: Row, condition: WhereCondition): boolean =>
  isWhereExpression(condition) ? condition.matches(row) : rowMatchesClause(row, condition);

const rowMatchesAllClauses = (row: Row, conditions: WhereCondition[]): boolean =>
  conditions.every((condition) => conditionMatches(row, condition));

const createExpressionBuilder = (): ExpressionBuilder => {
  const eb = ((column: string, operator: WhereOperator, value: unknown): WhereExpression => ({
    matches: (row) => rowMatchesClause(row, { column, operator, value }),
  })) as ExpressionBuilder;

  eb.or = (expressions: WhereExpression[]): WhereExpression => ({
    matches: (row) => expressions.some((expression) => expression.matches(row)),
  });

  return eb;
};

type WhereArgs =
  | [column: string, operator: WhereOperator, value: unknown]
  | [callback: (eb: ExpressionBuilder) => WhereExpression];

const resolveWhereCondition = (...args: WhereArgs): WhereCondition => {
  if (args.length === 1) {
    return args[0](createExpressionBuilder());
  }

  const [column, operator, value] = args;

  return { column, operator, value };
};

const projectColumns = (row: Row, columns: string[] | undefined): Row => {
  if (!columns) {
    return { ...row };
  }

  const projected: Row = {};

  for (const column of columns) {
    projected[column] = row[column];
  }

  return projected;
};

const sortRows = (
  rows: Row[],
  orderByClause: { column: string; direction: OrderDirection },
): Row[] => {
  const { column, direction } = orderByClause;

  return [...rows].sort((a, b) => {
    const left = a[column] as string | number;
    const right = b[column] as string | number;

    if (left === right) {
      return 0;
    }

    const ascendingResult = left < right ? -1 : 1;

    return direction === "asc" ? ascendingResult : -ascendingResult;
  });
};

const createSelectQuery = (rows: Row[]) => {
  const wheres: WhereCondition[] = [];
  let columns: string[] | undefined;
  let orderByClause: { column: string; direction: OrderDirection } | undefined;

  const matchingRows = (): Row[] => {
    const matched = rows.filter((row) => rowMatchesAllClauses(row, wheres));

    return orderByClause ? sortRows(matched, orderByClause) : matched;
  };

  const query = {
    select: (selectedColumns: string | string[]) => {
      columns = asColumnList(selectedColumns);

      return query;
    },
    selectAll: () => {
      columns = undefined;

      return query;
    },
    where: (...args: WhereArgs) => {
      wheres.push(resolveWhereCondition(...args));

      return query;
    },
    orderBy: (column: string, direction: OrderDirection) => {
      orderByClause = { column, direction };

      return query;
    },
    execute: async (): Promise<Row[]> => matchingRows().map((row) => projectColumns(row, columns)),
    executeTakeFirst: async (): Promise<Row | undefined> => {
      const [row] = matchingRows();

      return row ? projectColumns(row, columns) : undefined;
    },
    executeTakeFirstOrThrow: async (): Promise<Row> => {
      const [row] = matchingRows();

      if (!row) {
        throw new Error("fake-db: no row matched executeTakeFirstOrThrow()");
      }

      return projectColumns(row, columns);
    },
  };

  return query;
};

const createOnConflictBuilder = () => {
  let conflictColumn: string | undefined;
  let updateValues: Row = {};

  const builder = {
    column: (columnName: string) => {
      conflictColumn = columnName;

      return builder;
    },
    doUpdateSet: (values: Row) => {
      updateValues = values;

      return builder;
    },
    resolvedColumn: (): string | undefined => conflictColumn,
    resolvedUpdateValues: (): Row => updateValues,
  };

  return builder;
};

const createFakeTable = () => {
  const rows: Row[] = [];
  let nextId = 1;

  return {
    rows: (): Row[] => rows,
    insert: (values: Row): Row => {
      const row: Row = { id: String(nextId), ...values };

      nextId += 1;
      rows.push(row);

      return row;
    },
    findByColumn: (column: string, value: unknown): Row | undefined =>
      rows.find((row) => row[column] === value),
    updateMatching: (wheres: WhereCondition[], values: Row): void => {
      for (const row of rows.filter((row) => rowMatchesAllClauses(row, wheres))) {
        Object.assign(row, values);
      }
    },
    deleteMatching: (wheres: WhereCondition[]): void => {
      const remaining = rows.filter((row) => !rowMatchesAllClauses(row, wheres));

      rows.length = 0;
      rows.push(...remaining);
    },
    seed: (seedRows: Row[]): void => {
      rows.push(...seedRows);
    },
  };
};

type FakeTable = ReturnType<typeof createFakeTable>;

const createInsertQuery = (table: FakeTable) => {
  let values: Row = {};
  let conflict: ReturnType<typeof createOnConflictBuilder> | undefined;
  let returningColumns: string[] | undefined;

  const insertOrUpsert = (): Row => {
    const conflictColumn = conflict?.resolvedColumn();

    if (conflictColumn) {
      const existing = table.findByColumn(conflictColumn, values[conflictColumn]);

      if (existing) {
        Object.assign(existing, conflict?.resolvedUpdateValues());

        return existing;
      }
    }

    return table.insert(values);
  };

  const query = {
    values: (insertValues: Row) => {
      values = insertValues;

      return query;
    },
    onConflict: (callback: (builder: ReturnType<typeof createOnConflictBuilder>) => unknown) => {
      conflict = createOnConflictBuilder();
      callback(conflict);

      return query;
    },
    returning: (columns: string | string[]) => {
      returningColumns = asColumnList(columns);

      return query;
    },
    execute: async (): Promise<void> => {
      insertOrUpsert();
    },
    executeTakeFirst: async (): Promise<Row | undefined> =>
      projectColumns(insertOrUpsert(), returningColumns),
    executeTakeFirstOrThrow: async (): Promise<Row> =>
      projectColumns(insertOrUpsert(), returningColumns),
  };

  return query;
};

const createUpdateQuery = (table: FakeTable) => {
  const wheres: WhereCondition[] = [];
  let values: Row = {};

  const query = {
    set: (updateValues: Row) => {
      values = updateValues;

      return query;
    },
    where: (...args: WhereArgs) => {
      wheres.push(resolveWhereCondition(...args));

      return query;
    },
    execute: async (): Promise<void> => {
      table.updateMatching(wheres, values);
    },
  };

  return query;
};

const createDeleteQuery = (table: FakeTable) => {
  const wheres: WhereCondition[] = [];

  const query = {
    where: (...args: WhereArgs) => {
      wheres.push(resolveWhereCondition(...args));

      return query;
    },
    execute: async (): Promise<void> => {
      table.deleteMatching(wheres);
    },
  };

  return query;
};

export interface FakeDb {
  seed: (table: keyof DB, rows: Row[]) => void;
  rows: (table: keyof DB) => Row[];
}

export const createFakeDb = (): Kysely<DB> & FakeDb => {
  const tables = new Map<string, FakeTable>();

  const getTable = (name: keyof DB): FakeTable => {
    const existing = tables.get(name);

    if (existing) {
      return existing;
    }

    const table = createFakeTable();

    tables.set(name, table);

    return table;
  };

  const fakeDb: Record<string, unknown> = {
    selectFrom: (table: keyof DB) => createSelectQuery(getTable(table).rows()),
    insertInto: (table: keyof DB) => createInsertQuery(getTable(table)),
    updateTable: (table: keyof DB) => createUpdateQuery(getTable(table)),
    deleteFrom: (table: keyof DB) => createDeleteQuery(getTable(table)),
    transaction: () => ({
      execute: async (callback: (trx: Kysely<DB>) => Promise<unknown>) =>
        callback(fakeDb as unknown as Kysely<DB>),
    }),
    seed: (table: keyof DB, rows: Row[]) => {
      getTable(table).seed(rows);
    },
    rows: (table: keyof DB) => getTable(table).rows(),
  };

  return fakeDb as unknown as Kysely<DB> & FakeDb;
};
