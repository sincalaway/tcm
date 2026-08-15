import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  archiveLearningGoal: vi.fn(),
  attachReviewReminderSchedule: vi.fn(),
  createLearningGoal: vi.fn(),
  createReviewReminder: vi.fn(),
  createStudyNote: vi.fn(),
  deleteReviewReminder: vi.fn(),
  deleteReviewNotifications: vi.fn(),
  deleteStudyNote: vi.fn(),
  deleteKnowledgeDocument: vi.fn(),
  getKnowledgeDocumentDownload: vi.fn(),
  getReviewReminder: vi.fn(),
  getLearningOverview: vi.fn(),
  getStudyDesk: vi.fn(),
  listLearningGoals: vi.fn(),
  listKnowledgeDocuments: vi.fn(),
  searchKnowledgeDocuments: vi.fn(),
  listReviewNotifications: vi.fn(),
  listReviewReminders: vi.fn(),
  listSavedItems: vi.fn(),
  listStudyNotes: vi.fn(),
  markReviewReminderSeen: vi.fn(),
  markAllReviewRemindersSeen: vi.fn(),
  setReadingProgress: vi.fn(),
  toggleLearningPathStep: vi.fn(),
  toggleSavedItem: vi.fn(),
  updateLearningGoal: vi.fn(),
  updateReviewReminder: vi.fn(),
  updateStudyNote: vi.fn(),
  uploadKnowledgeDocument: vi.fn(),
}));

const heartbeatMock = vi.hoisted(() => ({ createHeartbeatJob: vi.fn(), deleteHeartbeatJob: vi.fn(), updateHeartbeatJob: vi.fn() }));

vi.mock("./db", () => dbMock);
vi.mock("./_core/heartbeat", () => heartbeatMock);

import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "learning-user",
      name: "Learning User",
      email: "learner@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("study router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes bookmark, note, and progress writes to the authenticated user", async () => {
    dbMock.toggleSavedItem.mockResolvedValue({ saved: true });
    dbMock.createStudyNote.mockResolvedValue({ id: 7 });
    dbMock.updateStudyNote.mockResolvedValue({ success: true });
    dbMock.setReadingProgress.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(createContext());

    await caller.study.saved.toggle({ resourceType: "herb", resourceId: 5 });
    await caller.study.notes.create({ resourceType: "formula", resourceId: 8, title: "条文疑问", body: "记录一条研读线索。" });
    await caller.study.notes.update({ id: 7, title: "条文疑问（修订）", body: "修订后的研读线索。" });
    await caller.study.progress.set({ classicId: 3, chapterId: 12, progressPercent: 70 });

    expect(dbMock.toggleSavedItem).toHaveBeenCalledWith(42, { resourceType: "herb", resourceId: 5 });
    expect(dbMock.createStudyNote).toHaveBeenCalledWith(42, { resourceType: "formula", resourceId: 8, title: "条文疑问", body: "记录一条研读线索。" });
    expect(dbMock.updateStudyNote).toHaveBeenCalledWith(42, { id: 7, title: "条文疑问（修订）", body: "修订后的研读线索。" });
    expect(dbMock.setReadingProgress).toHaveBeenCalledWith(42, { classicId: 3, chapterId: 12, progressPercent: 70 });
  });

  it("returns a personal desk only for the authenticated user", async () => {
    dbMock.getStudyDesk.mockResolvedValue({ saved: [], notes: [], progress: [] });
    const caller = appRouter.createCaller(createContext());
    await expect(caller.study.desk()).resolves.toEqual({ saved: [], notes: [], progress: [] });
    expect(dbMock.getStudyDesk).toHaveBeenCalledWith(42);
  });

  it("scopes learning-route overview and step updates to the authenticated user", async () => {
    dbMock.getLearningOverview.mockResolvedValue({ savedCount: 1, noteCount: 2, readingCount: 1, averageReadingProgress: 70, completedPathCount: 0, paths: [] });
    dbMock.toggleLearningPathStep.mockResolvedValue({ completedSteps: [1] });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.study.overview()).resolves.toMatchObject({ savedCount: 1, averageReadingProgress: 70 });
    await expect(caller.study.paths.toggleStep({ pathSlug: "gui-zhi-ying-wei", step: 1 })).resolves.toEqual({ completedSteps: [1] });

    expect(dbMock.getLearningOverview).toHaveBeenCalledWith(42);
    expect(dbMock.toggleLearningPathStep).toHaveBeenCalledWith(42, { pathSlug: "gui-zhi-ying-wei", step: 1 });
  });

  it("creates learning goals only for the authenticated user", async () => {
    dbMock.createLearningGoal.mockResolvedValue({ id: 11 });
    dbMock.listLearningGoals.mockResolvedValue([]);
    const caller = appRouter.createCaller(createContext());
    await caller.study.goals.create({ title: "完成三则条文研读", metric: "path_steps", targetCount: 3, deadlineAt: null });
    await caller.study.goals.list();
    expect(dbMock.createLearningGoal).toHaveBeenCalledWith(42, expect.objectContaining({ title: "完成三则条文研读", metric: "path_steps", targetCount: 3 }));
    expect(dbMock.listLearningGoals).toHaveBeenCalledWith(42);
  });

  it("binds reminder scheduling and pending events to the authenticated user", async () => {
    dbMock.createReviewReminder.mockResolvedValue({ id: 21 });
    heartbeatMock.createHeartbeatJob.mockResolvedValue({ taskUid: "task-21", nextExecutionAt: null });
    dbMock.attachReviewReminderSchedule.mockResolvedValue(undefined);
    dbMock.listReviewReminders.mockResolvedValue({ reminders: [], pending: [] });
    dbMock.markReviewReminderSeen.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(createContext());
    await caller.study.reminders.create({ title: "复习太阳病条文", goalId: null, intervalDays: 7, hourLocal: 9 });
    await caller.study.reminders.list();
    await caller.study.reminders.markSeen({ eventId: 31 });
    expect(dbMock.createReviewReminder).toHaveBeenCalledWith(42, expect.objectContaining({ title: "复习太阳病条文", intervalDays: 7, hourUtc: 1 }));
    expect(dbMock.attachReviewReminderSchedule).toHaveBeenCalledWith(42, 21, "task-21");
    expect(dbMock.listReviewReminders).toHaveBeenCalledWith(42);
    expect(dbMock.markReviewReminderSeen).toHaveBeenCalledWith(42, 31);
  });

  it("filters and batch-manages notification records only within the authenticated user's inbox", async () => {
    dbMock.listReviewNotifications.mockResolvedValue([]);
    dbMock.markAllReviewRemindersSeen.mockResolvedValue({ success: true });
    dbMock.deleteReviewNotifications.mockResolvedValue({ success: true, deleted: 2 });
    const caller = appRouter.createCaller(createContext());
    await caller.study.notifications.list({ status: "unread", from: new Date("2026-08-01T00:00:00Z"), to: new Date("2026-08-15T23:59:59Z") });
    await caller.study.notifications.markAllSeen();
    await caller.study.notifications.delete({ eventIds: [11, 12] });
    expect(dbMock.listReviewNotifications).toHaveBeenCalledWith(42, expect.objectContaining({ status: "unread" }));
    expect(dbMock.markAllReviewRemindersSeen).toHaveBeenCalledWith(42);
    expect(dbMock.deleteReviewNotifications).toHaveBeenCalledWith(42, [11, 12]);
  });

  it("keeps knowledge uploads, full-text search, download links and deletion inside the authenticated user scope", async () => {
    dbMock.uploadKnowledgeDocument.mockResolvedValue({ id: 9, title: "太阳病笔记.md" }); dbMock.listKnowledgeDocuments.mockResolvedValue([]); dbMock.searchKnowledgeDocuments.mockResolvedValue([]); dbMock.getKnowledgeDocumentDownload.mockResolvedValue({ id: 9, storageUrl: "/manus-storage/private" }); dbMock.deleteKnowledgeDocument.mockResolvedValue({ success: true });
    const caller = appRouter.createCaller(createContext());
    await caller.study.knowledge.upload({ fileName: "太阳病笔记.md", mimeType: "text/markdown", base64: "dGVzdA==" }); await caller.study.knowledge.list({ query: "太阳" }); await caller.study.knowledge.search({ query: "太阳" }); await caller.study.knowledge.download({ id: 9 }); await caller.study.knowledge.delete({ id: 9 });
    expect(dbMock.uploadKnowledgeDocument).toHaveBeenCalledWith(42, expect.objectContaining({ fileName: "太阳病笔记.md" }));
    expect(dbMock.listKnowledgeDocuments).toHaveBeenCalledWith(42, "太阳"); expect(dbMock.searchKnowledgeDocuments).toHaveBeenCalledWith(42, "太阳"); expect(dbMock.getKnowledgeDocumentDownload).toHaveBeenCalledWith(42, 9); expect(dbMock.deleteKnowledgeDocument).toHaveBeenCalledWith(42, 9);
  });
});
