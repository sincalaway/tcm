import { z } from "zod";
import { createStudyNote, deleteStudyNote, getStudyDesk, listSavedItems, listStudyNotes, setReadingProgress, toggleSavedItem, updateStudyNote } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const resourceInput = z.object({ resourceType: z.enum(["herb", "formula", "classic", "chapter"]), resourceId: z.number().int().positive() });

export const studyRouter = router({
  desk: protectedProcedure.query(({ ctx }) => getStudyDesk(ctx.user.id)),
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
