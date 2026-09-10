import { defineConfig } from "drizzle-kit";

// Loaded here (rather than relying on Next.js's env loading, which only
// applies inside the Next.js process) so `drizzle-kit generate`/`migrate`
// work as plain CLI commands. dotenv is a drizzle-kit dependency already,
// so this doesn't add a new project dependency.
import { config } from "dotenv";
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and configure a PostgreSQL connection string before running drizzle-kit commands.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
