import { drizzle } from "drizzle-orm/libsql/node";
import { serverEnv } from "@/lib/server-env";


export const db = drizzle({
  connection: {
    url: serverEnv.DATABASE_URL,
    authToken: serverEnv.DATABASE_AUTH_TOKEN,
  },
});
