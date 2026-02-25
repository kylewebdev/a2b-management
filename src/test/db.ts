import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import * as schema from "@/db/schema";

let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Get a Drizzle client for integration tests.
 * Requires DATABASE_URL to be set.
 */
export function getTestDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for DB integration tests");
  }
  if (!testDb) {
    const client = neon(process.env.DATABASE_URL);
    testDb = drizzle(client, { schema });
  }
  return testDb;
}

/**
 * Truncate all tables (cascade) for clean test state.
 */
export async function cleanDb() {
  const db = getTestDb();
  await db.execute(
    sql`TRUNCATE TABLE item_photos, items, estates CASCADE`
  );
}
