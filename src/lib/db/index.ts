import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Get database URL
const databaseUrl = process.env.DATABASE_URL!;

// Create the SQL client
const sql = neon(databaseUrl);

// Create drizzle instance
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from "./schema";
