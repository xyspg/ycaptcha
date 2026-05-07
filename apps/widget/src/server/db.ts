import { site } from "@ycaptcha/api/src/lib/db/app-schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "./env";

const client = postgres(env.DATABASE_URL, { max: 5, prepare: false });
export const db = drizzle(client, { schema: { site } });
export { site };
