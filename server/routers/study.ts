import { z } from "zod";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, deleteHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { archiveLearningGoal, attachReviewReminderSchedule, createLearningGoal, createReviewReminder, deleteKnowledgeDocument, deleteReviewNotifications, deleteReviewReminder, getKnowledgeDocumentDownload, getLearningOverview, getReviewReminder, getStudyDesk, listKnowledgeDocuments, listLearningGoals, listReviewNotifications, listReviewReminders, listSavedItems, listStudyNotes, markAllReviewRemindersSeen, markReviewReminderSeen, searchKnowledgeDocuments, setReadingProgress, toggleLearningPathStep, toggleSavedItem, updateLearningGoal, updateReviewReminder, updateStudyNote, createStudyNote, deleteStudyNote, uploadKnowledgeDocument } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const resourceInput = z.object({ resourceType: z.enum(["herb", "formula", "classic", "chapter"]), resourceId: z.number().int().positive() });
const goalInput = z.object({ title: z.string().trim().min(1).max(255), metric: z.enum(["path_steps", "reading_entries", "study_notes"]), targetCount: z.number().int().min(1).max(365), deadlineAt: z.coerce.date().nullable().optional() });
const reminderInput = z.object({ goalId: z.number().int().positive().nullable().optional(), title: z.string().trim().min(1).max(255), intervalDays: z.number().int().min(1).max(60), hourLocal: z.number().int().min(0).max(23) });
const getSessionToken = (cookieHeader: string | undefined) => parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
const toUtcHour = (hourLocal: number) => (hourLocal + 16) % 24; // 中国标准时间（UTC+8）换算为调度服务的 UTC 小时。
const dailyCron = (hourUtc: number) => `0 0 ${hourUtc} * * *`;

export const studyRouter = router({
  desk: protectedProcedure.query(({ ctx }) => getStudyDesk(ctx.user.id)),
  overview: protectedProcedure.query(({ ctx }) => getLearningOverview(ctx.user.id)),
  paths: router({
    toggleStep: protectedProcedure.input(z.object({ pathSlug: z.enum(["gui-zhi-ying-wei", "fu-ling-shui-ye", "bai-zhu-zhong-jiao"]), step: z.number().int().min(1).max(3) })).mutation(({ ctx, input }) => toggleLearningPathStep(ctx.user.id, input)),
  }),
  goals: router({
    list: protectedProcedure.query(({ ctx }) => listLearningGoals(ctx.user.id)),
    create: protectedProcedure.input(goalInput).mutation(({ ctx, input }) => createLearningGoal(ctx.user.id, input)),
    update: protectedProcedure.input(goalInput.extend({ id: z.number().int().positive() })).mutation(({ ctx, input }) => updateLearningGoal(ctx.user.id, input.id, input)),
    archive: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => archiveLearningGoal(ctx.user.id, input.id)),
  }),
  reminders: router({
    list: protectedProcedure.query(({ ctx }) => listReviewReminders(ctx.user.id)),
    create: protectedProcedure.input(reminderInput).mutation(async ({ ctx, input }) => {
      const hourUtc = toUtcHour(input.hourLocal); const sessionToken = getSessionToken(ctx.req.headers.cookie);
      const reminder = await createReviewReminder(ctx.user.id, { ...input, hourUtc });
      try {
        const job = await createHeartbeatJob({ name: `tcm-review-${ctx.user.id}-${reminder.id}`, cron: dailyCron(hourUtc), path: "/api/scheduled/review-reminders", payload: { reminderId: reminder.id }, description: `宋刻书斋复习提醒：${input.title}` }, sessionToken);
        await attachReviewReminderSchedule(ctx.user.id, reminder.id, job.taskUid);
        return { ...reminder, taskUid: job.taskUid, nextExecutionAt: job.nextExecutionAt ?? null };
      } catch (error) {
        await deleteReviewReminder(ctx.user.id, reminder.id);
        throw error;
      }
    }),
    update: protectedProcedure.input(reminderInput.extend({ id: z.number().int().positive(), enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
      const current = await getReviewReminder(ctx.user.id, input.id); if (!current) throw new Error("复习提醒不存在或无权访问");
      const hourUtc = toUtcHour(input.hourLocal); const sessionToken = getSessionToken(ctx.req.headers.cookie);
      if (current.scheduleCronTaskUid) await updateHeartbeatJob(current.scheduleCronTaskUid, { cron: dailyCron(hourUtc), enable: input.enabled, description: `宋刻书斋复习提醒：${input.title}` }, sessionToken);
      return updateReviewReminder(ctx.user.id, input.id, { ...input, hourUtc });
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const current = await getReviewReminder(ctx.user.id, input.id); if (!current) throw new Error("复习提醒不存在或无权访问");
      if (current.scheduleCronTaskUid) await deleteHeartbeatJob(current.scheduleCronTaskUid, getSessionToken(ctx.req.headers.cookie));
      return deleteReviewReminder(ctx.user.id, input.id);
    }),
    markSeen: protectedProcedure.input(z.object({ eventId: z.number().int().positive() })).mutation(({ ctx, input }) => markReviewReminderSeen(ctx.user.id, input.eventId)),
    markAllSeen: protectedProcedure.mutation(({ ctx }) => markAllReviewRemindersSeen(ctx.user.id)),
  }),
  notifications: router({
    list: protectedProcedure.input(z.object({ status: z.enum(["all", "unread", "read"]).default("all"), from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional()).query(({ ctx, input }) => listReviewNotifications(ctx.user.id, input ?? { status: "all" })),
    markAllSeen: protectedProcedure.mutation(({ ctx }) => markAllReviewRemindersSeen(ctx.user.id)),
    delete: protectedProcedure.input(z.object({ eventIds: z.array(z.number().int().positive()).min(1).max(200) })).mutation(({ ctx, input }) => deleteReviewNotifications(ctx.user.id, input.eventIds)),
  }),
  knowledge: router({
    list: protectedProcedure.input(z.object({ query: z.string().trim().max(80).optional() }).optional()).query(({ ctx, input }) => listKnowledgeDocuments(ctx.user.id, input?.query)),
    search: protectedProcedure.input(z.object({ query: z.string().trim().min(1).max(80) })).query(({ ctx, input }) => searchKnowledgeDocuments(ctx.user.id, input.query)),
    upload: protectedProcedure.input(z.object({ fileName: z.string().trim().min(1).max(255), mimeType: z.enum(["text/plain", "text/markdown", "application/pdf"]), base64: z.string().min(4).max(7_200_000) })).mutation(({ ctx, input }) => uploadKnowledgeDocument(ctx.user.id, input)),
    download: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => getKnowledgeDocumentDownload(ctx.user.id, input.id)),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteKnowledgeDocument(ctx.user.id, input.id)),
  }),
  saved: router({
    list: protectedProcedure.query(({ ctx }) => listSavedItems(ctx.user.id)),
    toggle: protectedProcedure.input(resourceInput).mutation(({ ctx, input }) => toggleSavedItem(ctx.user.id, input)),
  }),
  notes: router({
    list: protectedProcedure.input(resourceInput.partial().optional()).query(({ ctx, input }) => listStudyNotes(ctx.user.id, input)),
    create: protectedProcedure.input(resourceInput.extend({ title: z.string().trim().min(1).max(255), body: z.string().trim().min(1).max(10000) })).mutation(({ ctx, input }) => createStudyNote(ctx.user.id, input)),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(255), body: z.string().trim().min(1).max(10000) })).mutation(({ ctx, input }) => updateStudyNote(ctx.user.id, input)),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteStudyNote(ctx.user.id, input.id)),
  }),
  progress: router({
    set: protectedProcedure.input(z.object({ classicId: z.number().int().positive(), chapterId: z.number().int().positive().nullable().optional(), progressPercent: z.number().int().min(0).max(100) })).mutation(({ ctx, input }) => setReadingProgress(ctx.user.id, input)),
  }),
});
