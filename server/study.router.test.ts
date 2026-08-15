import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  createStudyNote: vi.fn(),
  deleteStudyNote: vi.fn(),
  getStudyDesk: vi.fn(),
  listSavedItems: vi.fn(),
  listStudyNotes: vi.fn(),
  setReadingProgress: vi.fn(),
  toggleSavedItem: vi.fn(),
  updateStudyNote: vi.fn(),
}));

vi.mock("./db", () => dbMock);

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
});
