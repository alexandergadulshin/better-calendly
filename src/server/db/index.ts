import { drizzle } from "drizzle-orm/postgres-js";
import { drizzle as drizzleVercel } from "drizzle-orm/vercel-postgres";
import { sql } from "@vercel/postgres";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

// Use Vercel Postgres in production, local postgres in development
let db: ReturnType<typeof drizzle> | ReturnType<typeof drizzleVercel>;

if (env.NODE_ENV === "production" && env.POSTGRES_URL) {
  // Production: Use Vercel Postgres
  db = drizzleVercel(sql, { schema });
} else {
  // Development: Use local postgres
  const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
  };

  const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
  if (env.NODE_ENV !== "production") globalForDb.conn = conn;
  
  db = drizzle(conn, { schema });
}

export { db };
