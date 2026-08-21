import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const connectionUrl = new URL(connectionString);
const usesTiDbCloud = connectionUrl.hostname.endsWith(".tidbcloud.com");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: usesTiDbCloud
    ? {
        host: connectionUrl.hostname,
        port: Number(connectionUrl.port || 4000),
        user: decodeURIComponent(connectionUrl.username),
        password: decodeURIComponent(connectionUrl.password),
        database: connectionUrl.pathname.replace(/^\//, ""),
        ssl: { rejectUnauthorized: true },
      }
    : { url: connectionString },
});
