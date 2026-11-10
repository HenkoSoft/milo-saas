// Simulated Prisma transport, not PostgreSQL. Real Better Auth/Prisma adapter runs above it.
export function simulatedDatabase({ markerMismatch = false, commitUncertain = false, failAuthAccount = false } = {}) {
  const names = ["authUser", "authAccount", "authSession", "authVerification", "tenant", "userProfile", "roleDefinition", "userRoleAssignment"];
  let committed = Object.fromEntries(names.map(name => [name, []]));
  const calls = [];
  let markerCalls = 0;
  function transport(state) {
    function matches(row, where = {}) {
      return Object.entries(where).every(([key, expected]) => {
        if (key === "OR") return expected.some(part => matches(row, part));
        if (key === "authUser") return matches(state.authUser.find(user => user.id === row.authUserId) ?? {}, expected);
        if (expected && typeof expected === "object" && "equals" in expected)
          return expected.mode === "insensitive" ? row[key]?.toLowerCase() === expected.equals.toLowerCase() : row[key] === expected.equals;
        return row[key] === expected;
      });
    }
    const select = (row, fields) => row && (fields ? Object.fromEntries(Object.keys(fields).filter(key => fields[key]).map(key => [key, row[key]])) : { ...row });
    const tx = Object.fromEntries(names.map(name => [name, {
      async findMany(args = {}) { return state[name].filter(row => matches(row, args.where)).map(row => select(row, args.select)); },
      async findUnique(args) { return select(state[name].find(row => matches(row, args.where)), args.select) ?? null; },
      async findFirst(args) { return this.findUnique(args); },
      async count(args = {}) { return state[name].filter(row => matches(row, args.where)).length; },
      async create({ data, select: fields }) {
        calls.push({ name, transaction: "outer-only" });
        if (name === "authAccount" && failAuthAccount) throw new Error("SIMULATED_CREDENTIAL_INSERT_FAILURE");
        if (state[name].some(row => row.id === data.id)) throw new Error("SIMULATED_UNIQUE_VIOLATION");
        const row = structuredClone(data);
        state[name].push(row);
        return select(row, fields);
      },
    }]));
    tx.$executeRaw = async () => 0;
    tx.$queryRaw = async (strings) => {
      const sql = strings.join("?");
      if (sql.includes("pg_advisory_xact_lock")) return [];
      if (sql.includes("pg_current_xact_id")) {
        markerCalls++;
        return [{ xid: markerMismatch && markerCalls > 1 ? "other" : "one-outer-transaction", pid: 123 }];
      }
      throw new Error("UNEXPECTED_SIMULATED_SQL");
    };
    return tx;
  }
  const db = {
    async $transaction(callback, options) {
      if (options.isolationLevel !== "Serializable") throw new Error("ISOLATION_NOT_SERIALIZABLE");
      const draft = structuredClone(committed);
      const result = await callback(transport(draft));
      committed = draft;
      if (commitUncertain) throw new Error("SIMULATED_COMMIT_ACK_LOST");
      return result;
    },
  };
  return { db, calls, state: () => structuredClone(committed), read: () => transport(committed), seed: (name, row) => committed[name].push(row), markerCalls: () => markerCalls };
}
