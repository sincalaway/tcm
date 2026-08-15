import type { Request, Response } from "express";
import { triggerReviewReminderByTaskUid } from "../db";
import { sdk } from "../_core/sdk";

/** Platform Heartbeat callback: task UID is authenticated by the platform and never read from request body. */
export async function handleReviewReminderSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await triggerReviewReminderByTaskUid(user.taskUid);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error), timestamp: new Date().toISOString() });
  }
}
