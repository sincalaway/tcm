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
    let schemaInitialized: boolean | null = null;
    let schemaTableCount: number | null = null;
    let schemaMilestones: Record<string, boolean> | null = null;

    if (databaseConfigured) {
      try {
        const db = await getDb();
        if (db) {
          await db.execute(sql`SELECT 1`);
          databaseReachable = true;
          const result = await db.execute(
            sql`SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('users', 'herbs', 'knowledge_documents', 'classic_passage_versions')`
          );
          const firstResult = Array.isArray(result) ? result[0] : undefined;
          const row = Array.isArray(firstResult) ? firstResult[0] : firstResult;
          schemaTableCount = Number((row as { tableCount?: unknown } | undefined)?.tableCount ?? 0);
          schemaInitialized = schemaTableCount === 4;

          const milestoneResult = await db.execute(
            sql`SELECT table_name AS tableName FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('content_sources', 'herbs', 'formulas', 'classics', 'classic_chapters', 'classic_passages', 'formula_passage_mappings', 'learning_path_progress', 'learning_goals', 'review_reminders', 'knowledge_documents', 'ai_study_conversations', 'ai_study_messages', 'ai_study_summaries', 'classic_passage_versions')`
          );
          const milestoneRows = Array.isArray(milestoneResult) ? milestoneResult[0] : [];
          const availableTables = new Set(
            (Array.isArray(milestoneRows) ? milestoneRows : []).map(
              (candidate) => String((candidate as { tableName?: unknown }).tableName)
            )
          );
          const hasAll = (tableNames: string[]) => tableNames.every((tableName) => availableTables.has(tableName));
          schemaMilestones = {
            coreCatalog: hasAll(["content_sources", "herbs", "formulas", "classics", "classic_chapters"]),
            passageGraph: hasAll(["classic_passages", "formula_passage_mappings"]),
            studyTools: hasAll(["learning_path_progress", "learning_goals", "review_reminders"]),
            knowledgeBase: hasAll(["knowledge_documents", "ai_study_conversations", "ai_study_messages", "ai_study_summaries"]),
            editionComparison: hasAll(["classic_passage_versions"]),
          };
        } else {
          databaseReachable = false;
        }
      } catch {
        // Do not log the driver error: connection errors may embed database
        // account names, hostnames, or other deployment-sensitive details.
        console.warn("[Health] Database connectivity check failed");
        databaseReachable = false;
      }
    }

    res.status(200).json({
      ok: true,
      runtime: process.env.VERCEL ? "vercel" : "node",
      databaseConfigured,
      databaseReachable,
      schemaInitialized,
      schemaTableCount,
      schemaMilestones,
      oauthConfigured: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
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
