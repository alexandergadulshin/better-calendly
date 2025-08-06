import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.POSTGRES_URL ?? env.DATABASE_URL ?? "postgresql://localhost:5432/better-calendly",
  },
  tablesFilter: ["better-calendly_*"],
} satisfies Config;
