const db = {
  prepare: (_sql: string) => ({
    run: (..._args: unknown[]) => ({}),
  }),
};

export default db;
