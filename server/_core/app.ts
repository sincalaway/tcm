import express from "express";
import { sql } from "drizzle-orm";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { getDb } from "../db";
import { appRouter } from "../routers";
import { handleReviewReminderSchedule } from "../scheduled/reviewReminders";
import { createContext } from "./context";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";

/**
 * Builds the request-scoped application shared by local Node development and
 * Vercel's Express runtime. Static assets are deliberately not registered here:
 * Vercel serves root-level public/** files through its CDN before this function.
 */
export function createApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", async (_req, res) => {
    const databaseConfigured = Boolean(process.env.DATABASE_URL);
    let databaseReachable: boolean | null = null;

    if (databaseConfigured) {
      try {
        const db = await getDb();
        if (db) {
          await db.execute(sql`SELECT 1`);
          databaseReachable = true;
        } else {
          databaseReachable = false;
        }
      } catch (error) {
        console.warn("[Health] Database connectivity check failed", error);
        databaseReachable = false;
      }
    }

    res.status(200).json({
      ok: true,
      runtime: process.env.VERCEL ? "vercel" : "node",
      databaseConfigured,
      databaseReachable,
      oauthConfigured: Boolean(process.env.OAUTH_SERVER_URL && process.env.VITE_APP_ID),
      storageConfigured: Boolean(process.env.BUILT_IN_FORGE_API_URL && process.env.BUILT_IN_FORGE_API_KEY),
    });
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/review-reminders", handleReviewReminderSchedule);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  return app;
}
