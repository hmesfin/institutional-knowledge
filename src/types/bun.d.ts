declare module 'bun:sqlite' {
  export default class Database {
    constructor(filename: string, options?: { readonly?: boolean; create?: boolean });

    close(): void;
    exec(sql: string): Database;
    query<T = any>(sql: string): PreparedStatement<T>;

    readonly inTransaction: boolean;
  }

  interface PreparedStatement<T = any> {
    run(...params: any[]): PreparedStatementRunResult;
    get(...params: any[]): T | null;
    all(...params: any[]): T[];
    finalize(): void;
  }

  interface PreparedStatementRunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }
}
