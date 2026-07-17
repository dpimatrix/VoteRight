import { Pool } from "pg";

// One pool per process (the §6.2 monolith talks to one Postgres).
// Next.js dev hot-reload re-evaluates modules, so stash the pool on globalThis.
const g = globalThis as unknown as { __vrPool?: Pool };

export function db(): Pool {
  if (!g.__vrPool) {
    g.__vrPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:vr@localhost:5433/voteright",
      max: 10,
    });
  }
  return g.__vrPool;
}
